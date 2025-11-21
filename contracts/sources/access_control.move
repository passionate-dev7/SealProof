/// AccessControl - Privacy and permission management with Seal encryption integration
/// Manages conditional access policies, encryption keys, and privacy settings
module truthchain::access_control {
    use sui::object::{Self, UID, ID};
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use sui::event;
    use sui::clock::{Self, Clock};
    use sui::table::{Self, Table};
    use std::string::{Self, String};
    use std::vector;
    use sui::vec_set::{Self, VecSet};

    // ======== Error Codes ========
    const E_NOT_AUTHORIZED: u64 = 1;
    const E_POLICY_NOT_FOUND: u64 = 2;
    const E_INVALID_CONDITION: u64 = 3;
    const E_ACCESS_DENIED: u64 = 4;
    const E_POLICY_EXPIRED: u64 = 5;
    const E_ALREADY_GRANTED: u64 = 6;
    const E_INVALID_ROLE: u64 = 7;

    // ======== Constants ========
    const ROLE_OWNER: u8 = 0;
    const ROLE_ADMIN: u8 = 1;
    const ROLE_VIEWER: u8 = 2;
    const ROLE_VERIFIER: u8 = 3;

    // ======== Structs ========

    /// Global access control registry
    public struct AccessRegistry has key {
        id: UID,
        policy_count: u64,
        // Maps content_id -> AccessPolicy ID
        policy_index: Table<ID, ID>,
        admin: address,
    }

    /// Admin capability
    public struct AccessAdminCap has key, store {
        id: UID,
    }

    /// Access policy for content
    public struct AccessPolicy has key, store {
        id: UID,
        content_id: ID,
        owner: address,
        created_at: u64,
        last_updated: u64,

        // Encryption integration
        seal_encryption_key: String,
        encryption_algorithm: String,

        // Privacy settings
        is_public: bool,
        require_verification: bool,

        // Role-based access
        admins: VecSet<address>,
        viewers: VecSet<address>,
        verifiers: VecSet<address>,

        // Conditional access
        conditions: Table<String, Condition>,

        // Time-based access
        access_start_time: u64,
        access_end_time: u64,
    }

    /// Access condition (e.g., minimum reputation, payment required)
    public struct Condition has store, drop {
        condition_type: String,
        parameter: String,
        value: u64,
        is_active: bool,
    }

    /// Access grant/permission token
    public struct AccessGrant has key, store {
        id: UID,
        policy_id: ID,
        granted_to: address,
        granted_by: address,
        role: u8,
        granted_at: u64,
        expires_at: u64,
        is_revoked: bool,
        decryption_key_fragment: String,
    }

    /// Access request
    public struct AccessRequest has key, store {
        id: UID,
        policy_id: ID,
        content_id: ID,
        requester: address,
        requested_role: u8,
        requested_at: u64,
        status: String, // "pending", "approved", "denied"
        justification: String,
    }

    // ======== Events ========

    public struct PolicyCreated has copy, drop {
        policy_id: ID,
        content_id: ID,
        owner: address,
        is_public: bool,
        timestamp: u64,
    }

    public struct AccessGranted has copy, drop {
        grant_id: ID,
        policy_id: ID,
        granted_to: address,
        granted_by: address,
        role: u8,
        timestamp: u64,
    }

    public struct AccessRevoked has copy, drop {
        grant_id: ID,
        revoked_by: address,
        timestamp: u64,
    }

    public struct PolicyUpdated has copy, drop {
        policy_id: ID,
        updated_by: address,
        update_type: String,
        timestamp: u64,
    }

    public struct AccessRequestSubmitted has copy, drop {
        request_id: ID,
        policy_id: ID,
        requester: address,
        requested_role: u8,
        timestamp: u64,
    }

    public struct ConditionAdded has copy, drop {
        policy_id: ID,
        condition_type: String,
        timestamp: u64,
    }

    // ======== Init Function ========

    fun init(ctx: &mut TxContext) {
        let admin = tx_context::sender(ctx);

        let registry = AccessRegistry {
            id: object::new(ctx),
            policy_count: 0,
            policy_index: table::new(ctx),
            admin,
        };

        let admin_cap = AccessAdminCap {
            id: object::new(ctx),
        };

        transfer::share_object(registry);
        transfer::transfer(admin_cap, admin);
    }

    // ======== Public Entry Functions ========

    /// Create access policy for content
    public entry fun create_policy(
        registry: &mut AccessRegistry,
        content_id: ID,
        seal_encryption_key: vector<u8>,
        encryption_algorithm: vector<u8>,
        is_public: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let owner = tx_context::sender(ctx);
        let timestamp = clock::timestamp_ms(clock);

        let policy = AccessPolicy {
            id: object::new(ctx),
            content_id,
            owner,
            created_at: timestamp,
            last_updated: timestamp,
            seal_encryption_key: string::utf8(seal_encryption_key),
            encryption_algorithm: string::utf8(encryption_algorithm),
            is_public,
            require_verification: false,
            admins: vec_set::empty(),
            viewers: vec_set::empty(),
            verifiers: vec_set::empty(),
            conditions: table::new(ctx),
            access_start_time: timestamp,
            access_end_time: 0, // 0 = no expiry
        };

        let policy_id = object::uid_to_inner(&policy.id);

        table::add(&mut registry.policy_index, content_id, policy_id);
        registry.policy_count = registry.policy_count + 1;

        event::emit(PolicyCreated {
            policy_id,
            content_id,
            owner,
            is_public,
            timestamp,
        });

        transfer::share_object(policy);
    }

    /// Grant access to user
    public entry fun grant_access(
        policy: &mut AccessPolicy,
        to: address,
        role: u8,
        expiry_duration_ms: u64,
        decryption_key_fragment: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        // Only owner or admins can grant access
        assert!(
            sender == policy.owner || vec_set::contains(&policy.admins, &sender),
            E_NOT_AUTHORIZED
        );

        assert!(role <= ROLE_VERIFIER, E_INVALID_ROLE);

        let timestamp = clock::timestamp_ms(clock);
        let expires_at = if (expiry_duration_ms == 0) { 0 } else { timestamp + expiry_duration_ms };

        // Add to role set
        if (role == ROLE_ADMIN) {
            if (!vec_set::contains(&policy.admins, &to)) {
                vec_set::insert(&mut policy.admins, to);
            };
        } else if (role == ROLE_VIEWER) {
            if (!vec_set::contains(&policy.viewers, &to)) {
                vec_set::insert(&mut policy.viewers, to);
            };
        } else if (role == ROLE_VERIFIER) {
            if (!vec_set::contains(&policy.verifiers, &to)) {
                vec_set::insert(&mut policy.verifiers, to);
            };
        };

        let grant = AccessGrant {
            id: object::new(ctx),
            policy_id: object::uid_to_inner(&policy.id),
            granted_to: to,
            granted_by: sender,
            role,
            granted_at: timestamp,
            expires_at,
            is_revoked: false,
            decryption_key_fragment: string::utf8(decryption_key_fragment),
        };

        let grant_id = object::uid_to_inner(&grant.id);

        policy.last_updated = timestamp;

        event::emit(AccessGranted {
            grant_id,
            policy_id: object::uid_to_inner(&policy.id),
            granted_to: to,
            granted_by: sender,
            role,
            timestamp,
        });

        transfer::transfer(grant, to);
    }

    /// Revoke access grant
    public entry fun revoke_access(
        policy: &mut AccessPolicy,
        grant: &mut AccessGrant,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        let sender = tx_context::sender(ctx);

        assert!(
            sender == policy.owner || sender == grant.granted_by,
            E_NOT_AUTHORIZED
        );

        grant.is_revoked = true;

        // Remove from role sets
        if (grant.role == ROLE_ADMIN && vec_set::contains(&policy.admins, &grant.granted_to)) {
            vec_set::remove(&mut policy.admins, &grant.granted_to);
        } else if (grant.role == ROLE_VIEWER && vec_set::contains(&policy.viewers, &grant.granted_to)) {
            vec_set::remove(&mut policy.viewers, &grant.granted_to);
        } else if (grant.role == ROLE_VERIFIER && vec_set::contains(&policy.verifiers, &grant.granted_to)) {
            vec_set::remove(&mut policy.verifiers, &grant.granted_to);
        };

        policy.last_updated = clock::timestamp_ms(clock);

        event::emit(AccessRevoked {
            grant_id: object::uid_to_inner(&grant.id),
            revoked_by: sender,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Add access condition
    public entry fun add_condition(
        policy: &mut AccessPolicy,
        condition_type: vector<u8>,
        parameter: vector<u8>,
        value: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == policy.owner, E_NOT_AUTHORIZED);

        let condition_type_str = string::utf8(condition_type);

        let condition = Condition {
            condition_type: condition_type_str,
            parameter: string::utf8(parameter),
            value,
            is_active: true,
        };

        if (table::contains(&policy.conditions, condition_type_str)) {
            table::remove(&mut policy.conditions, condition_type_str);
        };

        table::add(&mut policy.conditions, condition_type_str, condition);
        policy.last_updated = clock::timestamp_ms(clock);

        event::emit(ConditionAdded {
            policy_id: object::uid_to_inner(&policy.id),
            condition_type: condition_type_str,
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Update privacy settings
    public entry fun update_privacy_settings(
        policy: &mut AccessPolicy,
        is_public: bool,
        require_verification: bool,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == policy.owner, E_NOT_AUTHORIZED);

        policy.is_public = is_public;
        policy.require_verification = require_verification;
        policy.last_updated = clock::timestamp_ms(clock);

        event::emit(PolicyUpdated {
            policy_id: object::uid_to_inner(&policy.id),
            updated_by: tx_context::sender(ctx),
            update_type: string::utf8(b"privacy_settings"),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Set time-based access window
    public entry fun set_access_window(
        policy: &mut AccessPolicy,
        start_time: u64,
        end_time: u64,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(tx_context::sender(ctx) == policy.owner, E_NOT_AUTHORIZED);
        assert!(end_time == 0 || end_time > start_time, E_INVALID_CONDITION);

        policy.access_start_time = start_time;
        policy.access_end_time = end_time;
        policy.last_updated = clock::timestamp_ms(clock);

        event::emit(PolicyUpdated {
            policy_id: object::uid_to_inner(&policy.id),
            updated_by: tx_context::sender(ctx),
            update_type: string::utf8(b"access_window"),
            timestamp: clock::timestamp_ms(clock),
        });
    }

    /// Submit access request
    public entry fun request_access(
        policy: &AccessPolicy,
        requested_role: u8,
        justification: vector<u8>,
        clock: &Clock,
        ctx: &mut TxContext
    ) {
        assert!(requested_role <= ROLE_VERIFIER, E_INVALID_ROLE);

        let request = AccessRequest {
            id: object::new(ctx),
            policy_id: object::uid_to_inner(&policy.id),
            content_id: policy.content_id,
            requester: tx_context::sender(ctx),
            requested_role,
            requested_at: clock::timestamp_ms(clock),
            status: string::utf8(b"pending"),
            justification: string::utf8(justification),
        };

        let request_id = object::uid_to_inner(&request.id);

        event::emit(AccessRequestSubmitted {
            request_id,
            policy_id: object::uid_to_inner(&policy.id),
            requester: tx_context::sender(ctx),
            requested_role,
            timestamp: clock::timestamp_ms(clock),
        });

        transfer::transfer(request, policy.owner);
    }

    // ======== View Functions ========

    public fun is_public(policy: &AccessPolicy): bool {
        policy.is_public
    }

    public fun get_owner(policy: &AccessPolicy): address {
        policy.owner
    }

    public fun has_role(policy: &AccessPolicy, user: address, role: u8): bool {
        if (role == ROLE_OWNER) {
            policy.owner == user
        } else if (role == ROLE_ADMIN) {
            vec_set::contains(&policy.admins, &user)
        } else if (role == ROLE_VIEWER) {
            vec_set::contains(&policy.viewers, &user)
        } else if (role == ROLE_VERIFIER) {
            vec_set::contains(&policy.verifiers, &user)
        } else {
            false
        }
    }

    public fun is_access_valid(grant: &AccessGrant, current_time: u64): bool {
        !grant.is_revoked && (grant.expires_at == 0 || current_time <= grant.expires_at)
    }

    public fun get_encryption_key(policy: &AccessPolicy): String {
        policy.seal_encryption_key
    }

    public fun get_decryption_key_fragment(grant: &AccessGrant): String {
        grant.decryption_key_fragment
    }

    // ======== Admin Functions ========

    /// Emergency revoke all access to policy
    public entry fun admin_emergency_lockdown(
        _: &AccessAdminCap,
        policy: &mut AccessPolicy,
        clock: &Clock,
    ) {
        policy.is_public = false;
        policy.admins = vec_set::empty();
        policy.viewers = vec_set::empty();
        policy.verifiers = vec_set::empty();
        policy.last_updated = clock::timestamp_ms(clock);
    }

    // ======== Test-Only Functions ========

    #[test_only]
    public fun init_for_testing(ctx: &mut TxContext) {
        init(ctx);
    }
}
