#[test_only]
module truthchain::truth_oracle_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::test_utils;
    use truthchain::truth_oracle::{
        Self,
        OracleRegistry,
        AIOracle,
        DetectionResult,
        OracleAdminCap
    };

    const ADMIN: address = @0xAD;
    const ORACLE1: address = @0x1;
    const ORACLE2: address = @0x2;
    const ORACLE3: address = @0x3;

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            truth_oracle::init_for_testing(ts::ctx(&mut scenario));
        };
        scenario
    }

    #[test]
    fun test_register_oracle() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);

            truth_oracle::register_oracle(
                &mut registry,
                b"DeepFake Detector",
                b"deepfake_detector",
                b"v1.0.0",
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(truth_oracle::get_oracle_count(&registry) == 1, 0);

            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORACLE1);
        {
            let oracle = ts::take_from_sender<AIOracle>(&scenario);

            assert!(truth_oracle::get_oracle_reputation(&oracle) == 500, 0);
            assert!(truth_oracle::get_accuracy_rate(&oracle) == 0, 1);

            ts::return_to_sender(&scenario, oracle);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_detection_submission_and_consensus() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let content_id = object::id_from_address(@0xC0);

        // Register 3 oracles
        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            truth_oracle::register_oracle(&mut registry, b"Oracle1", b"ai_detector", b"v1", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORACLE2);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            truth_oracle::register_oracle(&mut registry, b"Oracle2", b"ai_detector", b"v1", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORACLE3);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            truth_oracle::register_oracle(&mut registry, b"Oracle3", b"ai_detector", b"v1", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        // Create detection result
        ts::next_tx(&mut scenario, ORACLE1);
        {
            truth_oracle::create_detection_result(content_id, &clock, ts::ctx(&mut scenario));
        };

        // Submit detections (2 vote AI-generated, 1 votes human)
        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);

            truth_oracle::submit_detection(
                &mut registry,
                &mut oracle,
                &mut result,
                true, // AI-generated
                85, // 85% confidence
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        ts::next_tx(&mut scenario, ORACLE2);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);

            truth_oracle::submit_detection(
                &mut registry,
                &mut oracle,
                &mut result,
                true, // AI-generated
                90,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        ts::next_tx(&mut scenario, ORACLE3);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);

            truth_oracle::submit_detection(
                &mut registry,
                &mut oracle,
                &mut result,
                false, // Human-created
                60,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(truth_oracle::get_submission_count(&result) == 3, 0);

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        // Check consensus reached
        ts::next_tx(&mut scenario, ORACLE1);
        {
            let result = ts::take_shared<DetectionResult>(&scenario);

            assert!(truth_oracle::is_consensus_reached(&result), 0);
            assert!(truth_oracle::get_final_verdict(&result) == true, 1); // AI-generated won

            ts::return_shared(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_reputation_update() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let content_id = object::id_from_address(@0xC0);

        // Register oracles and create detection result
        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            truth_oracle::register_oracle(&mut registry, b"Oracle1", b"ai_detector", b"v1", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORACLE2);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            truth_oracle::register_oracle(&mut registry, b"Oracle2", b"ai_detector", b"v1", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORACLE3);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            truth_oracle::register_oracle(&mut registry, b"Oracle3", b"ai_detector", b"v1", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORACLE1);
        {
            truth_oracle::create_detection_result(content_id, &clock, ts::ctx(&mut scenario));
        };

        // Submit detections to reach consensus
        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);
            truth_oracle::submit_detection(&mut registry, &mut oracle, &mut result, true, 80, &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        ts::next_tx(&mut scenario, ORACLE2);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);
            truth_oracle::submit_detection(&mut registry, &mut oracle, &mut result, true, 85, &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        ts::next_tx(&mut scenario, ORACLE3);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);
            truth_oracle::submit_detection(&mut registry, &mut oracle, &mut result, false, 60, &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        // Update reputation for oracle that voted correctly
        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let result = ts::take_shared<DetectionResult>(&scenario);

            let old_rep = truth_oracle::get_oracle_reputation(&oracle);

            truth_oracle::update_oracle_reputation(&mut oracle, &result, ts::ctx(&mut scenario));

            let new_rep = truth_oracle::get_oracle_reputation(&oracle);
            assert!(new_rep > old_rep, 0); // Reputation should increase for correct vote

            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = truthchain::truth_oracle::E_INVALID_CONFIDENCE)]
    fun test_invalid_confidence_fails() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let content_id = object::id_from_address(@0xC0);

        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            truth_oracle::register_oracle(&mut registry, b"Oracle1", b"ai_detector", b"v1", &clock, ts::ctx(&mut scenario));
            ts::return_shared(registry);
        };

        ts::next_tx(&mut scenario, ORACLE1);
        {
            truth_oracle::create_detection_result(content_id, &clock, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ORACLE1);
        {
            let mut registry = ts::take_shared<OracleRegistry>(&scenario);
            let mut oracle = ts::take_from_sender<AIOracle>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);

            truth_oracle::submit_detection(
                &mut registry,
                &mut oracle,
                &mut result,
                true,
                101, // Invalid: > 100
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(registry);
            ts::return_to_sender(&scenario, oracle);
            ts::return_shared(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_admin_emergency_override() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let content_id = object::id_from_address(@0xC0);

        ts::next_tx(&mut scenario, ORACLE1);
        {
            truth_oracle::create_detection_result(content_id, &clock, ts::ctx(&mut scenario));
        };

        ts::next_tx(&mut scenario, ADMIN);
        {
            let admin_cap = ts::take_from_sender<OracleAdminCap>(&scenario);
            let mut result = ts::take_shared<DetectionResult>(&scenario);

            truth_oracle::admin_emergency_override(
                &admin_cap,
                &mut result,
                false,
                b"Manual review determined human-created",
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(truth_oracle::get_final_verdict(&result) == false, 0);

            ts::return_to_sender(&scenario, admin_cap);
            ts::return_shared(result);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
