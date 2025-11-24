/// TruthOracle - AI-powered content verification with multi-verifier consensus
/// Stores AI detection results, confidence scores, and time-weighted reputation
module sealproof::truth_oracle {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use std::vector;
    use sui::vec_map::{Self, VecMap};

    // ======== Error Codes ========
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_INVALID_CONFIDENCE: u64 = 2;
    const E_INVALID_ORACLE: u64 = 3;
    const E_ALREADY_SUBMITTED: u64 = 4;
    const E_INSUFFICIENT_SUBMISSIONS: u64 = 5;
    const E_CONSENSUS_NOT_REACHED: u64 = 6;
    const E_ORACLE_NOT_REGISTERED: u64 = 7;
    const E_EMERGENCY_LOCKED: u64 = 8;

    // ======== Constants ========
    const MIN_CONFIDENCE: u64 = 0;
    const MAX_CONFIDENCE: u64 = 100;
    const MIN_ORACLES_FOR_CONSENSUS: u64 = 3;
    const CONSENSUS_THRESHOLD: u64 = 66; // 66% agreement required
    const REPUTATION_DECAY_PERIOD_MS: u64 = 2_592_000_000; // 30 days
    const TIME_WEIGHT_FACTOR: u64 = 10; // Decay factor for time-weighted reputation

    // ======== Structs ========

    /// Global oracle registry
    public struct OracleRegistry has key {
        id: UID,
        oracle_count: u64,
        total_verifications: u64,
        // Maps oracle address -> Oracle ID
        oracle_index: Table<address, ID>,
        admin: address,
        emergency_paused: bool,
    }

    /// Admin capability
    public struct OracleAdminCap has key, store {
        id: UID,
    }

    /// Registered AI oracle/verifier
    public struct AIOracle has key, store {
        id: UID,
        address: address,
        name: String,
        model_type: String, // e.g., "deepfake_detector", "ai_content_detector"
        version: String,
        registration_timestamp: u64,
        last_active: u64,
        total_submissions: u64,
        accurate_submissions: u64,
        reputation_score: u64, // 0-1000 time-weighted score
        is_active: bool,
        metadata: VecMap<String, String>,
    }

    /// AI detection result for content
    public struct DetectionResult has key, store {
        id: UID,
        content_id: ID, // Reference to ContentProof
        // Submission tracking
        submissions: Table<address, OracleSubmission>,
        submission_count: u64,
        created_at: u64,
        finalized_at: u64,
        // Consensus result
        is_finalized: bool,
        consensus_reached: bool,
        final_verdict: bool, // true = AI-generated, false = human-created
        final_confidence: u64,
        // Aggregated data
        total_ai_votes: u64,
        total_human_votes: u64,
        weighted_confidence: u64,
    }

    /// Individual oracle submission
    public struct OracleSubmission has store, drop {
        oracle: address,
        is_ai_generated: bool,
        confidence: u64,
        model_version: String,
        timestamp: u64,
        weight: u64, // Based on oracle reputation
    }

    /// Emergency override capability
    public struct EmergencyOverride has key, store {
        id: UID,
        content_id: ID,
        overridden_by: address,
        new_verdict: bool,
        reason: String,
        timestamp: u64,
    }

    // ======== Events ========

    public struct OracleRegistered has copy, drop {
        oracle: address,
        name: String,
        model_type: String,
        timestamp: u64,
    }

    public struct DetectionSubmitted has copy, drop {
        result_id: ID,
        oracle: address,
        is_ai_generated: bool,
        confidence: u64,
        timestamp: u64,
    }

    public struct ConsensusReached has copy, drop {
        result_id: ID,
        content_id: ID,
        verdict: bool,
        confidence: u64,
        submission_count: u64,
        timestamp: u64,
    }

    public struct ReputationDecayed has copy, drop {
        oracle: address,
        old_score: u64,
        new_score: u64,
        timestamp: u64,
    }

    public struct EmergencyOverrideExecuted has copy, drop {
        content_id: ID,
        overridden_by: address,
        new_verdict: bool,
        reason: String,
        timestamp: u64,
    }

    // ======== Init Function ========

    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let registry = OracleRegistry {
            id: object::new(ctx),
            oracle_count: 0,
            total_verifications: 0,
            oracle_index: table::new(ctx),
            admin,
            emergency_paused: false,
        };

        let admin_cap = OracleAdminCap {
            id: object::new(ctx),
        };

        transfer::share_object(registry);
        transfer::transfer(admin_cap, admin);
    }

    // ======== Public Entry Functions ========

    /// Register as an AI oracle
    public entry fun register_oracle(
        registry: &mut OracleRegistry,
        name: vector<u8>,
        model_type: vector<u8>,
        version: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let oracle_addr = tx_context::sender(ctx);
        assert!(!table::contains(&registry.oracle_index, oracle_addr), E_ALREADY_SUBMITTED);

        let timestamp = clock::timestamp_ms(clock);

        let oracle = AIOracle {
            id: object::new(ctx),
            address: oracle_addr,
            name: string::utf8(name),
            model_type: string::utf8(model_type),
            version: string::utf8(version),
            registration_timestamp: timestamp,
            last_active: timestamp,
            total_submissions: 0,
            accurate_submissions: 0,
            reputation_score: 500, // Start at 50% (out of 1000)
            is_active: true,
            metadata: vec_map::empty(),
        };

        let oracle_id = object::uid_to_inner(&oracle.id);

        table::add(&mut registry.oracle_index, oracle_addr, oracle_id);
        registry.oracle_count = registry.oracle_count + 1;

        event::emit(OracleRegistered {
            oracle: oracle_addr,
            name: string::utf8(name),
            model_type: string::utf8(model_type),
            timestamp,
        });

        transfer::public_transfer(oracle, oracle_addr);
    }

    /// Create new detection result record
    public entry fun create_detection_result(
        content_id: ID,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let result = DetectionResult {
            id: object::new(ctx),
            content_id,
            submissions: table::new(ctx),
            submission_count: 0,
            created_at: clock::timestamp_ms(clock),
            finalized_at: 0,
            is_finalized: false,
            consensus_reached: false,
            final_verdict: false,
            final_confidence: 0,
            total_ai_votes: 0,
            total_human_votes: 0,
            weighted_confidence: 0,
        };

        transfer::share_object(result);
    }

    /// Submit AI detection result
    public entry fun submit_detection(
        registry: &mut OracleRegistry,
        oracle: &mut AIOracle,
        result: &mut DetectionResult,
        is_ai_generated: bool,
        confidence: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(!registry.emergency_paused, E_EMERGENCY_LOCKED);
        assert!(tx_context::sender(ctx) == oracle.address, E_NOT_AUTHORIZED);
        assert!(oracle.is_active, E_ORACLE_NOT_REGISTERED);
        assert!(!result.is_finalized, E_CONSENSUS_NOT_REACHED);
        assert!(!table::contains(&result.submissions, oracle.address), E_ALREADY_SUBMITTED);
        assert!(confidence >= MIN_CONFIDENCE && confidence <= MAX_CONFIDENCE, E_INVALID_CONFIDENCE);

        let timestamp = clock::timestamp_ms(clock);

        // Apply time-based reputation decay
        apply_reputation_decay(oracle, timestamp);

        // Calculate weight based on reputation
        let weight = oracle.reputation_score;

        let submission = OracleSubmission {
            oracle: oracle.address,
            is_ai_generated,
            confidence,
            model_version: oracle.version,
            timestamp,
            weight,
        };

        table::add(&mut result.submissions, oracle.address, submission);
        result.submission_count = result.submission_count + 1;

        // Update vote counts
        if (is_ai_generated) {
            result.total_ai_votes = result.total_ai_votes + weight;
        } else {
            result.total_human_votes = result.total_human_votes + weight;
        };

        oracle.total_submissions = oracle.total_submissions + 1;
        oracle.last_active = timestamp;
        registry.total_verifications = registry.total_verifications + 1;

        event::emit(DetectionSubmitted {
            result_id: object::uid_to_inner(&result.id),
            oracle: oracle.address,
            is_ai_generated,
            confidence,
            timestamp,
        });

        // Check if consensus can be reached
        if (result.submission_count >= MIN_ORACLES_FOR_CONSENSUS) {
            try_finalize_consensus(result, timestamp);
        };
    }

    /// Manually finalize consensus (if minimum submissions met)
    public entry fun finalize_consensus(
        result: &mut DetectionResult,
        clock: &Clock,
        _ctx: &mut TxContext
    ) {
        assert!(!result.is_finalized, E_CONSENSUS_NOT_REACHED);
        assert!(result.submission_count >= MIN_ORACLES_FOR_CONSENSUS, E_INSUFFICIENT_SUBMISSIONS);

        try_finalize_consensus(result, clock::timestamp_ms(clock));
    }

    /// Update oracle reputation after consensus
    public entry fun update_oracle_reputation(
        oracle: &mut AIOracle,
        result: &DetectionResult,
        _ctx: &mut TxContext
    ) {
        assert!(result.is_finalized, E_CONSENSUS_NOT_REACHED);
        assert!(table::contains(&result.submissions, oracle.address), E_NOT_AUTHORIZED);

        let submission = table::borrow(&result.submissions, oracle.address);

        // Check if oracle's submission matches consensus
        let was_correct = submission.is_ai_generated == result.final_verdict;

        if (was_correct) {
            oracle.accurate_submissions = oracle.accurate_submissions + 1;
            // Increase reputation
            let increase = 20;
            if (oracle.reputation_score + increase > 1000) {
                oracle.reputation_score = 1000;
            } else {
                oracle.reputation_score = oracle.reputation_score + increase;
            };
        } else {
            // Decrease reputation
            let decrease = 30;
            if (oracle.reputation_score < decrease) {
                oracle.reputation_score = 0;
            } else {
                oracle.reputation_score = oracle.reputation_score - decrease;
            };
        };
    }

    // ======== Internal Functions ========

    /// Try to finalize consensus if threshold met
    fun try_finalize_consensus(result: &mut DetectionResult, timestamp: u64) {
        let total_votes = result.total_ai_votes + result.total_human_votes;

        if (total_votes == 0) {
            return
        };

        let ai_percentage = (result.total_ai_votes * 100) / total_votes;
        let human_percentage = (result.total_human_votes * 100) / total_votes;

        // Check if consensus threshold reached
        if (ai_percentage >= CONSENSUS_THRESHOLD || human_percentage >= CONSENSUS_THRESHOLD) {
            result.is_finalized = true;
            result.consensus_reached = true;
            result.final_verdict = ai_percentage >= CONSENSUS_THRESHOLD;
            result.final_confidence = if (ai_percentage >= CONSENSUS_THRESHOLD) { ai_percentage } else { human_percentage };
            result.finalized_at = timestamp;

            event::emit(ConsensusReached {
                result_id: object::uid_to_inner(&result.id),
                content_id: result.content_id,
                verdict: result.final_verdict,
                confidence: result.final_confidence,
                submission_count: result.submission_count,
                timestamp,
            });
        };
    }

    /// Apply time-based reputation decay
    fun apply_reputation_decay(oracle: &mut AIOracle, current_time: u64) {
        let time_since_active = current_time - oracle.last_active;

        if (time_since_active > REPUTATION_DECAY_PERIOD_MS) {
            let old_score = oracle.reputation_score;
            let decay_periods = time_since_active / REPUTATION_DECAY_PERIOD_MS;
            let decay_amount = decay_periods * TIME_WEIGHT_FACTOR;

            if (oracle.reputation_score > decay_amount) {
                oracle.reputation_score = oracle.reputation_score - decay_amount;
            } else {
                oracle.reputation_score = 0;
            };

            event::emit(ReputationDecayed {
                oracle: oracle.address,
                old_score,
                new_score: oracle.reputation_score,
                timestamp: current_time,
            });
        };
    }

    // ======== View Functions ========

    public fun get_oracle_count(registry: &OracleRegistry): u64 {
        registry.oracle_count
    }

    public fun get_oracle_reputation(oracle: &AIOracle): u64 {
        oracle.reputation_score
    }

    public fun get_accuracy_rate(oracle: &AIOracle): u64 {
        if (oracle.total_submissions == 0) {
            return 0
        };
        (oracle.accurate_submissions * 100) / oracle.total_submissions
    }

    public fun is_consensus_reached(result: &DetectionResult): bool {
        result.consensus_reached
    }

    public fun get_final_verdict(result: &DetectionResult): bool {
        result.final_verdict
    }

    public fun get_final_confidence(result: &DetectionResult): u64 {
        result.final_confidence
    }

    public fun get_submission_count(result: &DetectionResult): u64 {
        result.submission_count
    }

    // ======== Admin Functions ========

    /// Emergency pause all oracle operations
    public entry fun admin_emergency_pause(
        _: &OracleAdminCap,
        registry: &mut OracleRegistry,
    ) {
        registry.emergency_paused = true;
    }

    /// Resume oracle operations
    public entry fun admin_resume(
        _: &OracleAdminCap,
        registry: &mut OracleRegistry,
    ) {
        registry.emergency_paused = false;
    }

    /// Emergency override consensus result
    public entry fun admin_emergency_override(
        _: &OracleAdminCap,
        result: &mut DetectionResult,
        new_verdict: bool,
        reason: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let timestamp = clock::timestamp_ms(clock);

        result.final_verdict = new_verdict;
        result.is_finalized = true;

        let override_record = EmergencyOverride {
            id: object::new(ctx),
            content_id: result.content_id,
            overridden_by: tx_context::sender(ctx),
            new_verdict,
            reason: string::utf8(reason),
            timestamp,
        };

        event::emit(EmergencyOverrideExecuted {
            content_id: result.content_id,
            overridden_by: tx_context::sender(ctx),
            new_verdict,
            reason: string::utf8(reason),
            timestamp,
        });

        transfer::share_object(override_record);
    }

    /// Deactivate malicious oracle
    public entry fun admin_deactivate_oracle(
        _: &OracleAdminCap,
        oracle: &mut AIOracle,
    ) {
        oracle.is_active = false;
        oracle.reputation_score = 0;
    }

    // ======== Test-Only Functions ========

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
