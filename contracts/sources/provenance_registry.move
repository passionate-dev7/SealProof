/// ProvenanceRegistry - Core content registration and verification system
/// Stores cryptographic proofs, metadata, and ownership for all content
module truthchain::provenance_registry {
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
    const E_CONTENT_ALREADY_REGISTERED: u64 = 2;
    const E_INVALID_HASH: u64 = 3;
    const E_CONTENT_NOT_FOUND: u64 = 4;
    const E_INVALID_METADATA: u64 = 5;
    const E_TRANSFER_NOT_ALLOWED: u64 = 6;

    // ======== Structs ========

    /// Global registry singleton
    public struct Registry has key {
        id: UID,
        content_count: u64,
        // Maps content_hash -> ContentProof ID
        content_index: Table<vector<u8>, ID>,
        // Admin capability for emergency operations
        admin: address,
    }

    /// Admin capability for registry management
    public struct AdminCap has key, store {
        id: UID,
    }

    /// Individual content proof record
    public struct ContentProof has key, store {
        id: UID,
        // Cryptographic proof
        content_hash: vector<u8>,
        algorithm: String, // e.g., "SHA256", "BLAKE2b"

        // Ownership
        creator: address,
        current_owner: address,

        // Temporal data
        registration_timestamp: u64,
        last_updated: u64,

        // Metadata
        metadata: VecMap<String, String>,

        // Integration points
        walrus_blob_id: String, // Walrus storage reference
        seal_encryption_key: String, // Seal encryption reference

        // Verification status
        verification_count: u64,
        trust_score: u64, // 0-100 scale

        // Transfer control
        transferable: bool,
    }

    /// Transfer capability for controlled ownership transfers
    public struct TransferCap has key, store {
        id: UID,
        content_proof_id: ID,
        from: address,
        to: address,
        expires_at: u64,
    }

    // ======== Events ========

    public struct ContentRegistered has copy, drop {
        content_id: ID,
        content_hash: vector<u8>,
        creator: address,
        timestamp: u64,
        walrus_blob_id: String,
    }

    public struct ContentVerified has copy, drop {
        content_id: ID,
        verifier: address,
        trust_score: u64,
        timestamp: u64,
    }

    public struct ContentUpdated has copy, drop {
        content_id: ID,
        updated_by: address,
        timestamp: u64,
        update_type: String,
    }

    public struct OwnershipTransferred has copy, drop {
        content_id: ID,
        from: address,
        to: address,
        timestamp: u64,
    }

    public struct MetadataUpdated has copy, drop {
        content_id: ID,
        key: String,
        value: String,
        timestamp: u64,
    }

    // ======== Init Function ========

    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        // Create global registry
        let registry = Registry {
            id: object::new(ctx),
            content_count: 0,
            content_index: table::new(ctx),
            admin,
        };

        // Create admin capability
        let admin_cap = AdminCap {
            id: object::new(ctx),
        };

        transfer::share_object(registry);
        transfer::transfer(admin_cap, admin);
    }

    // ======== Public Entry Functions ========

    /// Register new content with cryptographic proof
    public entry fun register_content(
        registry: &mut Registry,
        content_hash: vector<u8>,
        algorithm: vector<u8>,
        walrus_blob_id: vector<u8>,
        seal_encryption_key: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Validate inputs
        assert!(vector::length(&content_hash) > 0, E_INVALID_HASH);
        assert!(!table::contains(&registry.content_index, content_hash), E_CONTENT_ALREADY_REGISTERED);

        let creator = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        // Create content proof
        let content_proof = ContentProof {
            id: object::new(ctx),
            content_hash,
            algorithm: string::utf8(algorithm),
            creator,
            current_owner: creator,
            registration_timestamp: timestamp,
            last_updated: timestamp,
            metadata: vec_map::empty(),
            walrus_blob_id: string::utf8(walrus_blob_id),
            seal_encryption_key: string::utf8(seal_encryption_key),
            verification_count: 0,
            trust_score: 50, // Start at neutral
            transferable: true,
        };

        let content_id = object::uid_to_inner(&content_proof.id);

        // Update registry
        table::add(&mut registry.content_index, content_hash, content_id);
        registry.content_count = registry.content_count + 1;

        // Emit event
        event::emit(ContentRegistered {
            content_id,
            content_hash,
            creator,
            timestamp,
            walrus_blob_id: string::utf8(walrus_blob_id),
        });

        // Transfer to creator
        transfer::public_transfer(content_proof, creator);
    }

    /// Add or update metadata for content
    public entry fun update_metadata(
        content_proof: &mut ContentProof,
        key: vector<u8>,
        value: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Only owner can update metadata
        assert!(tx_context::sender(ctx) == content_proof.current_owner, E_NOT_AUTHORIZED);

        let key_str = string::utf8(key);
        let value_str = string::utf8(value);

        // Update or add metadata
        if (vec_map::contains(&content_proof.metadata, &key_str)) {
            let (_, _) = vec_map::remove(&mut content_proof.metadata, &key_str);
        };
        vec_map::insert(&mut content_proof.metadata, key_str, value_str);

        content_proof.last_updated = clock::timestamp_ms(clock);

        event::emit(MetadataUpdated {
            content_id: object::uid_to_inner(&content_proof.id),
            key: key_str,
            value: value_str,
            timestamp: content_proof.last_updated,
        });
    }

    /// Record verification of content
    public entry fun record_verification(
        content_proof: &mut ContentProof,
        new_trust_score: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        // Trust score should be 0-100
        assert!(new_trust_score <= 100, E_INVALID_METADATA);

        let verifier = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        content_proof.verification_count = content_proof.verification_count + 1;

        // Weighted average: give more weight to new verifications
        let weight = 7; // 70% new, 30% old
        content_proof.trust_score = (content_proof.trust_score * (10 - weight) + new_trust_score * weight) / 10;
        content_proof.last_updated = timestamp;

        event::emit(ContentVerified {
            content_id: object::uid_to_inner(&content_proof.id),
            verifier,
            trust_score: content_proof.trust_score,
            timestamp,
        });
    }

    /// Create transfer capability for controlled ownership transfer
    public entry fun create_transfer_cap(
        content_proof: &ContentProof,
        to: address,
        expiry_ms: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == content_proof.current_owner, E_NOT_AUTHORIZED);
        assert!(content_proof.transferable, E_TRANSFER_NOT_ALLOWED);

        let transfer_cap = TransferCap {
            id: object::new(ctx),
            content_proof_id: object::uid_to_inner(&content_proof.id),
            from: content_proof.current_owner,
            to,
            expires_at: clock::timestamp_ms(clock) + expiry_ms,
        };

        transfer::transfer(transfer_cap, to);
    }

    /// Execute ownership transfer using capability
    public entry fun execute_transfer(
        content_proof: &mut ContentProof,
        transfer_cap: TransferCap,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let TransferCap { id, content_proof_id, from, to, expires_at } = transfer_cap;

        // Validate transfer capability
        assert!(content_proof_id == object::uid_to_inner(&content_proof.id), E_NOT_AUTHORIZED);
        assert!(tx_context::sender(ctx) == to, E_NOT_AUTHORIZED);
        assert!(clock::timestamp_ms(clock) <= expires_at, E_NOT_AUTHORIZED);
        assert!(content_proof.current_owner == from, E_NOT_AUTHORIZED);

        // Transfer ownership
        content_proof.current_owner = to;
        content_proof.last_updated = clock::timestamp_ms(clock);

        event::emit(OwnershipTransferred {
            content_id: object::uid_to_inner(&content_proof.id),
            from,
            to,
            timestamp: content_proof.last_updated,
        });

        object::delete(id);
    }

    /// Toggle transferability (owner only)
    public entry fun set_transferable(
        content_proof: &mut ContentProof,
        transferable: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == content_proof.current_owner, E_NOT_AUTHORIZED);

        content_proof.transferable = transferable;
        content_proof.last_updated = clock::timestamp_ms(clock);

        event::emit(ContentUpdated {
            content_id: object::uid_to_inner(&content_proof.id),
            updated_by: tx_context::sender(ctx),
            timestamp: content_proof.last_updated,
            update_type: string::utf8(b"transferability_changed"),
        });
    }

    // ======== View Functions ========

    /// Get content hash
    public fun get_content_hash(proof: &ContentProof): vector<u8> {
        proof.content_hash
    }

    /// Get creator address
    public fun get_creator(proof: &ContentProof): address {
        proof.creator
    }

    /// Get current owner
    public fun get_owner(proof: &ContentProof): address {
        proof.current_owner
    }

    /// Get trust score
    public fun get_trust_score(proof: &ContentProof): u64 {
        proof.trust_score
    }

    /// Get verification count
    public fun get_verification_count(proof: &ContentProof): u64 {
        proof.verification_count
    }

    /// Get Walrus blob ID
    public fun get_walrus_blob_id(proof: &ContentProof): String {
        proof.walrus_blob_id
    }

    /// Get registration timestamp
    public fun get_registration_timestamp(proof: &ContentProof): u64 {
        proof.registration_timestamp
    }

    /// Get total content count
    public fun get_content_count(registry: &Registry): u64 {
        registry.content_count
    }

    /// Check if content is registered
    public fun is_content_registered(registry: &Registry, content_hash: vector<u8>): bool {
        table::contains(&registry.content_index, content_hash)
    }

    // ======== Admin Functions ========

    /// Emergency pause transferability (admin only)
    public entry fun admin_pause_transfers(
        _: &AdminCap,
        content_proof: &mut ContentProof,
        clock: &Clock,
    ) {
        content_proof.transferable = false;
        content_proof.last_updated = clock::timestamp_ms(clock);
    }

    /// Update trust score override (admin only)
    public entry fun admin_override_trust_score(
        _: &AdminCap,
        content_proof: &mut ContentProof,
        new_score: u64,
        clock: &Clock,
    ) {
        assert!(new_score <= 100, E_INVALID_METADATA);
        content_proof.trust_score = new_score;
        content_proof.last_updated = clock::timestamp_ms(clock);
    }

    // ======== Test-Only Functions ========

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
