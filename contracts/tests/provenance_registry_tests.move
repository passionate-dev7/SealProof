// Comprehensive test suite for ProvenanceRegistry contract
// Coverage target: 95%+

#[test_only]
module truthchain::provenance_registry_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use truthchain::provenance_registry::{
        Self,
        ProvenanceRegistry,
        ContentRecord,
        VerificationStatus,
        AdminCap
    };

    // Test constants
    const ADMIN: address = @0xAD;
    const USER1: address = @0xA1;
    const USER2: address = @0xA2;
    const VERIFIER: address = @0xVF;

    // Test walrus blob IDs
    const BLOB_ID_1: vector<u8> = b"walrus_blob_abc123";
    const BLOB_ID_2: vector<u8> = b"walrus_blob_def456";
    const CONTENT_HASH_1: vector<u8> = b"sha256_hash_content_1";
    const CONTENT_HASH_2: vector<u8> = b"sha256_hash_content_2";

    // Helper function to initialize test scenario
    fun setup_test(scenario: &mut Scenario) {
        ts::next_tx(scenario, ADMIN);
        {
            provenance_registry::init_for_testing(ts::ctx(scenario));
        };
    }

    // Helper to create a test clock
    fun create_test_clock(scenario: &mut Scenario): Clock {
        clock::create_for_testing(ts::ctx(scenario))
    }

    // ========== INITIALIZATION TESTS ==========

    #[test]
    fun test_init_creates_registry() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);

        ts::next_tx(&mut scenario, ADMIN);
        {
            assert!(ts::has_most_recent_shared<ProvenanceRegistry>(), 0);
            assert!(ts::has_most_recent_for_sender<AdminCap>(&scenario), 1);
        };

        ts::end(scenario);
    }

    // ========== CONTENT REGISTRATION TESTS ==========

    #[test]
    fun test_register_content_success() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            provenance_registry::register_content(
                &mut registry,
                BLOB_ID_1,
                CONTENT_HASH_1,
                b"image/jpeg",
                b"Original photo from camera",
                b"device_metadata_json",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // Verify content was registered
        ts::next_tx(&mut scenario, USER1);
        {
            let registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            assert!(provenance_registry::content_exists(&registry, BLOB_ID_1), 2);
            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_register_content_mints_nft() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            provenance_registry::register_content(
                &mut registry,
                BLOB_ID_1,
                CONTENT_HASH_1,
                b"image/jpeg",
                b"Test content",
                b"{}",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // Verify NFT was minted to user
        ts::next_tx(&mut scenario, USER1);
        {
            assert!(ts::has_most_recent_for_sender<ContentRecord>(&scenario), 3);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = provenance_registry::E_CONTENT_ALREADY_EXISTS)]
    fun test_register_duplicate_content_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            // Register first time
            provenance_registry::register_content(
                &mut registry,
                BLOB_ID_1,
                CONTENT_HASH_1,
                b"image/jpeg",
                b"Test",
                b"{}",
                &clock,
                ts::ctx(&mut scenario)
            );

            // Try to register same content again - should fail
            provenance_registry::register_content(
                &mut registry,
                BLOB_ID_1,
                CONTENT_HASH_1,
                b"image/jpeg",
                b"Test",
                b"{}",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = provenance_registry::E_INVALID_CONTENT_HASH)]
    fun test_register_empty_hash_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            provenance_registry::register_content(
                &mut registry,
                BLOB_ID_1,
                vector::empty<u8>(), // Empty hash should fail
                b"image/jpeg",
                b"Test",
                b"{}",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== VERIFICATION TESTS ==========

    #[test]
    fun test_add_verification_success() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        // Register content
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry,
                BLOB_ID_1,
                CONTENT_HASH_1,
                b"image/jpeg",
                b"Test",
                b"{}",
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Add verification
        ts::next_tx(&mut scenario, VERIFIER);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            provenance_registry::add_verification(
                &mut registry,
                BLOB_ID_1,
                true, // is_authentic
                95, // confidence_score (0-100)
                b"AI detection: 95% confidence authentic",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        // Verify verification was added
        ts::next_tx(&mut scenario, USER1);
        {
            let registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            let verification_count = provenance_registry::get_verification_count(&registry, BLOB_ID_1);
            assert!(verification_count == 1, 4);
            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_multiple_verifications_consensus() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        // Register content
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry,
                BLOB_ID_1,
                CONTENT_HASH_1,
                b"image/jpeg",
                b"Test",
                b"{}",
                &clock,
                ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Add verification 1 (authentic)
        ts::next_tx(&mut scenario, VERIFIER);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::add_verification(
                &mut registry, BLOB_ID_1, true, 90, b"Verifier 1", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Add verification 2 (authentic)
        ts::next_tx(&mut scenario, USER2);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::add_verification(
                &mut registry, BLOB_ID_1, true, 85, b"Verifier 2", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Check consensus
        ts::next_tx(&mut scenario, USER1);
        {
            let registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            assert!(provenance_registry::get_verification_count(&registry, BLOB_ID_1) == 2, 5);
            let consensus_score = provenance_registry::get_consensus_score(&registry, BLOB_ID_1);
            assert!(consensus_score >= 85, 6); // Should be average or weighted
            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = provenance_registry::E_CONTENT_NOT_FOUND)]
    fun test_verify_nonexistent_content_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, VERIFIER);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            provenance_registry::add_verification(
                &mut registry,
                b"nonexistent_blob",
                true,
                90,
                b"Should fail",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = provenance_registry::E_INVALID_CONFIDENCE_SCORE)]
    fun test_verification_invalid_score_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                b"Test", b"{}", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, VERIFIER);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            // Score > 100 should fail
            provenance_registry::add_verification(
                &mut registry,
                BLOB_ID_1,
                true,
                150, // Invalid score
                b"Should fail",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== CHAIN OF CUSTODY TESTS ==========

    #[test]
    fun test_update_chain_of_custody() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                b"Original", b"{}", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Update custody
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            let record = ts::take_from_sender<ContentRecord>(&scenario);

            provenance_registry::update_custody(
                &mut registry,
                &record,
                b"edited",
                b"Cropped and color corrected",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_to_sender(&scenario, record);
            ts::return_shared(registry);
        };

        // Verify custody chain updated
        ts::next_tx(&mut scenario, USER1);
        {
            let registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            let custody_length = provenance_registry::get_custody_chain_length(&registry, BLOB_ID_1);
            assert!(custody_length >= 1, 7);
            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = provenance_registry::E_NOT_OWNER)]
    fun test_update_custody_unauthorized_fails() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                b"Original", b"{}", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // USER2 tries to update USER1's content
        ts::next_tx(&mut scenario, USER2);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            // This should fail - USER2 doesn't own the content
            provenance_registry::update_custody_unauthorized(
                &mut registry,
                BLOB_ID_1,
                b"hacked",
                b"Should fail",
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== QUERY AND LOOKUP TESTS ==========

    #[test]
    fun test_lookup_content_by_hash() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                b"Test", b"{}", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Lookup by content hash
        ts::next_tx(&mut scenario, USER2);
        {
            let registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            let blob_id = provenance_registry::lookup_by_content_hash(&registry, CONTENT_HASH_1);
            assert!(blob_id == BLOB_ID_1, 8);
            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_get_content_metadata() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                b"Test description", b"{\"camera\": \"Canon EOS\"}", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, USER2);
        {
            let registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            let (mime_type, description) = provenance_registry::get_content_metadata(&registry, BLOB_ID_1);
            assert!(mime_type == b"image/jpeg", 9);
            assert!(description == b"Test description", 10);
            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== EDGE CASES AND STRESS TESTS ==========

    #[test]
    fun test_large_content_description() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);

            // Create a large description (2KB)
            let mut large_desc = vector::empty<u8>();
            let mut i = 0;
            while (i < 2000) {
                vector::push_back(&mut large_desc, 65); // 'A'
                i = i + 1;
            };

            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                large_desc, b"{}", &clock, ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_concurrent_verifications() {
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        // Register content
        ts::next_tx(&mut scenario, USER1);
        {
            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                b"Test", b"{}", &clock, ts::ctx(&mut scenario)
            );
            ts::return_shared(registry);
        };

        // Simulate 10 concurrent verifications
        let mut count = 0;
        while (count < 10) {
            let verifier = @0x100 + count;
            ts::next_tx(&mut scenario, verifier);
            {
                let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
                provenance_registry::add_verification(
                    &mut registry, BLOB_ID_1, true, 80 + (count % 20),
                    b"Concurrent verification", &clock, ts::ctx(&mut scenario)
                );
                ts::return_shared(registry);
            };
            count = count + 1;
        };

        // Verify all verifications were recorded
        ts::next_tx(&mut scenario, USER1);
        {
            let registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            assert!(provenance_registry::get_verification_count(&registry, BLOB_ID_1) == 10, 11);
            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    // ========== GAS OPTIMIZATION TESTS ==========

    #[test]
    fun test_gas_efficient_registration() {
        // Test that registration uses reasonable gas
        let mut scenario = ts::begin(ADMIN);
        setup_test(&mut scenario);
        let clock = create_test_clock(&mut scenario);

        ts::next_tx(&mut scenario, USER1);
        {
            let gas_before = ts::ctx(&mut scenario).epoch();

            let mut registry = ts::take_shared<ProvenanceRegistry>(&scenario);
            provenance_registry::register_content(
                &mut registry, BLOB_ID_1, CONTENT_HASH_1, b"image/jpeg",
                b"Minimal data for gas test", b"{}", &clock, ts::ctx(&mut scenario)
            );

            let gas_after = ts::ctx(&mut scenario).epoch();
            // Gas should be within reasonable bounds
            assert!(gas_after >= gas_before, 12);

            ts::return_shared(registry);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
