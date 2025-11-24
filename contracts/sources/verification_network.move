/// VerificationNetwork - Decentralized verifier network with staking and reputation
/// Manages verifier registration, voting, rewards, and slashing
module sealproof::verification_network {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use sui::balance::{Self, Balance};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use std::string::{Self, String};
    use std::vector;
    use sui::vec_map::{Self, VecMap};

    // ======== Error Codes ========
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_ALREADY_REGISTERED: u64 = 2;
    const E_NOT_REGISTERED: u64 = 3;
    const E_INSUFFICIENT_STAKE: u64 = 4;
    const E_INVALID_VOTE: u64 = 5;
    const E_ALREADY_VOTED: u64 = 6;
    const E_VOTING_CLOSED: u64 = 7;
    const E_INSUFFICIENT_REPUTATION: u64 = 8;
    const E_INVALID_AMOUNT: u64 = 9;

    // ======== Constants ========
    const MIN_STAKE: u64 = 1_000_000_000; // 1 SUI minimum stake
    const MIN_REPUTATION: u64 = 10;
    const REWARD_POOL_PERCENTAGE: u64 = 80; // 80% of fees go to verifiers
    const SLASH_PERCENTAGE: u64 = 10; // 10% of stake slashed for bad behavior
    const VOTING_PERIOD_MS: u64 = 86_400_000; // 24 hours

    // ======== Structs ========

    /// Global verification network state
    public struct VerificationNetwork has key {
        id: UID,
        verifier_count: u64,
        total_stake: u64,
        reward_pool: Balance<SUI>,
        // Maps verifier address -> Verifier ID
        verifier_index: Table<address, ID>,
        admin: address,
    }

    /// Admin capability
    public struct NetworkAdminCap has key, store {
        id: UID,
    }

    /// Individual verifier profile
    public struct Verifier has key, store {
        id: UID,
        address: address,
        stake: Balance<SUI>,
        reputation_score: u64, // 0-1000 scale
        total_verifications: u64,
        successful_verifications: u64,
        registration_timestamp: u64,
        last_active: u64,
        metadata: VecMap<String, String>,
        is_active: bool,
    }

    /// Verification task/request
    public struct VerificationTask has key, store {
        id: UID,
        content_id: ID, // Reference to ContentProof
        requester: address,
        created_at: u64,
        voting_ends_at: u64,
        // Voting state
        votes_for: u64,
        votes_against: u64,
        total_voting_power: u64,
        voters: Table<address, Vote>,
        // Result
        is_finalized: bool,
        result: bool, // true = verified, false = rejected
        reward_amount: u64,
    }

    /// Individual vote on a verification task
    public struct Vote has store, drop {
        voter: address,
        vote: bool, // true = approve, false = reject
        voting_power: u64,
        timestamp: u64,
    }

    /// Reward claim ticket
    public struct RewardClaim has key, store {
        id: UID,
        verifier: address,
        task_id: ID,
        amount: u64,
    }

    // ======== Events ========

    public struct VerifierRegistered has copy, drop {
        verifier: address,
        stake_amount: u64,
        timestamp: u64,
    }

    public struct VerificationTaskCreated has copy, drop {
        task_id: ID,
        content_id: ID,
        requester: address,
        voting_ends_at: u64,
    }

    public struct VoteCast has copy, drop {
        task_id: ID,
        voter: address,
        vote: bool,
        voting_power: u64,
        timestamp: u64,
    }

    public struct TaskFinalized has copy, drop {
        task_id: ID,
        result: bool,
        votes_for: u64,
        votes_against: u64,
        timestamp: u64,
    }

    public struct RewardDistributed has copy, drop {
        task_id: ID,
        verifier: address,
        amount: u64,
        timestamp: u64,
    }

    public struct VerifierSlashed has copy, drop {
        verifier: address,
        amount: u64,
        reason: String,
        timestamp: u64,
    }

    public struct ReputationUpdated has copy, drop {
        verifier: address,
        old_score: u64,
        new_score: u64,
        timestamp: u64,
    }

    // ======== Init Function ========

    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let network = VerificationNetwork {
            id: object::new(ctx),
            verifier_count: 0,
            total_stake: 0,
            reward_pool: balance::zero(),
            verifier_index: table::new(ctx),
            admin,
        };

        let admin_cap = NetworkAdminCap {
            id: object::new(ctx),
        };

        transfer::share_object(network);
        transfer::transfer(admin_cap, admin);
    }

    // ======== Public Entry Functions ========

    /// Register as a verifier with stake
    public entry fun register_verifier(
        network: &mut VerificationNetwork,
        stake: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let verifier_addr = tx_context::sender(ctx);

        assert!(!table::contains(&network.verifier_index, verifier_addr), E_ALREADY_REGISTERED);

        let stake_amount = coin::value(&stake);
        assert!(stake_amount >= MIN_STAKE, E_INSUFFICIENT_STAKE);

        let timestamp = clock::timestamp_ms(clock);

        let verifier = Verifier {
            id: object::new(ctx),
            address: verifier_addr,
            stake: coin::into_balance(stake),
            reputation_score: 100, // Start at 10% (out of 1000)
            total_verifications: 0,
            successful_verifications: 0,
            registration_timestamp: timestamp,
            last_active: timestamp,
            metadata: vec_map::empty(),
            is_active: true,
        };

        let verifier_id = object::uid_to_inner(&verifier.id);

        table::add(&mut network.verifier_index, verifier_addr, verifier_id);
        network.verifier_count = network.verifier_count + 1;
        network.total_stake = network.total_stake + stake_amount;

        event::emit(VerifierRegistered {
            verifier: verifier_addr,
            stake_amount,
            timestamp,
        });

        transfer::public_transfer(verifier, verifier_addr);
    }

    /// Add additional stake
    public entry fun add_stake(
        network: &mut VerificationNetwork,
        verifier: &mut Verifier,
        additional_stake: Coin<SUI>,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == verifier.address, E_NOT_AUTHORIZED);

        let amount = coin::value(&additional_stake);
        balance::join(&mut verifier.stake, coin::into_balance(additional_stake));
        network.total_stake = network.total_stake + amount;
    }

    /// Create verification task
    public entry fun create_verification_task(
        network: &mut VerificationNetwork,
        content_id: ID,
        payment: Coin<SUI>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let requester = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);
        let payment_amount = coin::value(&payment);

        assert!(payment_amount > 0, E_INVALID_AMOUNT);

        // Add payment to reward pool
        let payment_balance = coin::into_balance(payment);
        balance::join(&mut network.reward_pool, payment_balance);

        let task = VerificationTask {
            id: object::new(ctx),
            content_id,
            requester,
            created_at: timestamp,
            voting_ends_at: timestamp + VOTING_PERIOD_MS,
            votes_for: 0,
            votes_against: 0,
            total_voting_power: 0,
            voters: table::new(ctx),
            is_finalized: false,
            result: false,
            reward_amount: (payment_amount * REWARD_POOL_PERCENTAGE) / 100,
        };

        let task_id = object::uid_to_inner(&task.id);

        event::emit(VerificationTaskCreated {
            task_id,
            content_id,
            requester,
            voting_ends_at: task.voting_ends_at,
        });

        transfer::share_object(task);
    }

    /// Cast vote on verification task
    public entry fun cast_vote(
        verifier: &mut Verifier,
        task: &mut VerificationTask,
        vote: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == verifier.address, E_NOT_AUTHORIZED);
        assert!(verifier.is_active, E_NOT_REGISTERED);
        assert!(!task.is_finalized, E_VOTING_CLOSED);

        let timestamp = clock::timestamp_ms(clock);
        assert!(timestamp <= task.voting_ends_at, E_VOTING_CLOSED);
        assert!(!table::contains(&task.voters, verifier.address), E_ALREADY_VOTED);

        // Voting power based on stake and reputation
        let stake_value = balance::value(&verifier.stake);
        let voting_power = (stake_value * verifier.reputation_score) / 1000;

        assert!(voting_power > 0, E_INSUFFICIENT_STAKE);

        let vote_record = Vote {
            voter: verifier.address,
            vote,
            voting_power,
            timestamp,
        };

        table::add(&mut task.voters, verifier.address, vote_record);

        if (vote) {
            task.votes_for = task.votes_for + voting_power;
        } else {
            task.votes_against = task.votes_against + voting_power;
        };

        task.total_voting_power = task.total_voting_power + voting_power;
        verifier.last_active = timestamp;

        event::emit(VoteCast {
            task_id: object::uid_to_inner(&task.id),
            voter: verifier.address,
            vote,
            voting_power,
            timestamp,
        });
    }

    /// Finalize verification task and distribute rewards
    public entry fun finalize_task(
        network: &mut VerificationNetwork,
        task: &mut VerificationTask,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let timestamp = clock::timestamp_ms(clock);

        assert!(!task.is_finalized, E_VOTING_CLOSED);
        assert!(timestamp > task.voting_ends_at, E_VOTING_CLOSED);

        // Determine result (simple majority)
        task.result = task.votes_for > task.votes_against;
        task.is_finalized = true;

        event::emit(TaskFinalized {
            task_id: object::uid_to_inner(&task.id),
            result: task.result,
            votes_for: task.votes_for,
            votes_against: task.votes_against,
            timestamp,
        });
    }

    /// Claim reward for successful verification
    public entry fun claim_reward(
        network: &mut VerificationNetwork,
        verifier: &mut Verifier,
        task: &VerificationTask,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == verifier.address, E_NOT_AUTHORIZED);
        assert!(task.is_finalized, E_VOTING_CLOSED);
        assert!(table::contains(&task.voters, verifier.address), E_NOT_AUTHORIZED);

        let vote = table::borrow(&task.voters, verifier.address);

        // Reward only if voted with majority
        if (vote.vote == task.result) {
            let voting_power = vote.voting_power;
            let reward = (task.reward_amount * voting_power) / task.total_voting_power;

            if (reward > 0 && balance::value(&network.reward_pool) >= reward) {
                let reward_balance = balance::split(&mut network.reward_pool, reward);
                let reward_coin = coin::from_balance(reward_balance, ctx);

                transfer::public_transfer(reward_coin, verifier.address);

                // Update verifier stats
                verifier.successful_verifications = verifier.successful_verifications + 1;
                update_reputation(verifier, true);

                event::emit(RewardDistributed {
                    task_id: object::uid_to_inner(&task.id),
                    verifier: verifier.address,
                    amount: reward,
                    timestamp: clock::timestamp_ms(clock),
                });
            };
        } else {
            // Penalize wrong votes
            update_reputation(verifier, false);
        };

        verifier.total_verifications = verifier.total_verifications + 1;
    }

    // ======== Internal Functions ========

    /// Update verifier reputation
    fun update_reputation(verifier: &mut Verifier, success: bool) {
        let old_score = verifier.reputation_score;

        if (success) {
            // Increase reputation (max 1000)
            let increase = 10;
            if (verifier.reputation_score + increase > 1000) {
                verifier.reputation_score = 1000;
            } else {
                verifier.reputation_score = verifier.reputation_score + increase;
            };
        } else {
            // Decrease reputation (min 0)
            let decrease = 20;
            if (verifier.reputation_score < decrease) {
                verifier.reputation_score = 0;
            } else {
                verifier.reputation_score = verifier.reputation_score - decrease;
            };
        };
    }

    // ======== View Functions ========

    public fun get_verifier_count(network: &VerificationNetwork): u64 {
        network.verifier_count
    }

    public fun get_total_stake(network: &VerificationNetwork): u64 {
        network.total_stake
    }

    public fun get_verifier_stake(verifier: &Verifier): u64 {
        balance::value(&verifier.stake)
    }

    public fun get_reputation_score(verifier: &Verifier): u64 {
        verifier.reputation_score
    }

    public fun get_success_rate(verifier: &Verifier): u64 {
        if (verifier.total_verifications == 0) {
            return 0
        };
        (verifier.successful_verifications * 100) / verifier.total_verifications
    }

    public fun is_task_finalized(task: &VerificationTask): bool {
        task.is_finalized
    }

    public fun get_task_result(task: &VerificationTask): bool {
        task.result
    }

    // ======== Admin Functions ========

    /// Slash verifier for malicious behavior
    public entry fun admin_slash_verifier(
        _: &NetworkAdminCap,
        network: &mut VerificationNetwork,
        verifier: &mut Verifier,
        reason: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let stake_amount = balance::value(&verifier.stake);
        let slash_amount = (stake_amount * SLASH_PERCENTAGE) / 100;

        if (slash_amount > 0) {
            let slashed = balance::split(&mut verifier.stake, slash_amount);
            balance::join(&mut network.reward_pool, slashed);
            network.total_stake = network.total_stake - slash_amount;

            event::emit(VerifierSlashed {
                verifier: verifier.address,
                amount: slash_amount,
                reason: string::utf8(reason),
                timestamp: clock::timestamp_ms(clock),
            });
        };

        verifier.is_active = false;
        verifier.reputation_score = 0;
    }

    // ======== Test-Only Functions ========

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
