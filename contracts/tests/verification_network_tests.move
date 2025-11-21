#[test_only]
module truthchain::verification_network_tests {
    use sui::test_scenario::{Self as ts, Scenario};
    use sui::clock::{Self, Clock};
    use sui::coin::{Self, Coin};
    use sui::sui::SUI;
    use sui::test_utils;
    use truthchain::verification_network::{
        Self,
        VerificationNetwork,
        Verifier,
        VerificationTask,
        NetworkAdminCap
    };

    const ADMIN: address = @0xAD;
    const VERIFIER1: address = @0x1;
    const VERIFIER2: address = @0x2;
    const VERIFIER3: address = @0x3;
    const REQUESTER: address = @0x4;
    const MIN_STAKE: u64 = 1_000_000_000;

    fun setup_test(): Scenario {
        let mut scenario = ts::begin(ADMIN);
        {
            verification_network::init_for_testing(ts::ctx(&mut scenario));
        };
        scenario
    }

    fun mint_sui(amount: u64, ctx: &mut TxContext): Coin<SUI> {
        coin::mint_for_testing<SUI>(amount, ctx)
    }

    #[test]
    fun test_register_verifier() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, VERIFIER1);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));

            verification_network::register_verifier(
                &mut network,
                stake,
                &clock,
                ts::ctx(&mut scenario)
            );

            assert!(verification_network::get_verifier_count(&network) == 1, 0);
            assert!(verification_network::get_total_stake(&network) == MIN_STAKE, 1);

            ts::return_shared(network);
        };

        // Verify verifier object created
        ts::next_tx(&mut scenario, VERIFIER1);
        {
            let verifier = ts::take_from_sender<Verifier>(&scenario);

            assert!(verification_network::get_verifier_stake(&verifier) == MIN_STAKE, 2);
            assert!(verification_network::get_reputation_score(&verifier) == 100, 3);

            ts::return_to_sender(&scenario, verifier);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_add_stake() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));

        // Register verifier
        ts::next_tx(&mut scenario, VERIFIER1);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));

            verification_network::register_verifier(
                &mut network,
                stake,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(network);
        };

        // Add additional stake
        ts::next_tx(&mut scenario, VERIFIER1);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let mut verifier = ts::take_from_sender<Verifier>(&scenario);
            let additional = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));

            verification_network::add_stake(
                &mut network,
                &mut verifier,
                additional,
                ts::ctx(&mut scenario)
            );

            assert!(verification_network::get_verifier_stake(&verifier) == MIN_STAKE * 2, 0);
            assert!(verification_network::get_total_stake(&network) == MIN_STAKE * 2, 1);

            ts::return_shared(network);
            ts::return_to_sender(&scenario, verifier);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_create_verification_task() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let content_id = object::id_from_address(@0xC0);

        ts::next_tx(&mut scenario, REQUESTER);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let payment = mint_sui(10_000_000, ts::ctx(&mut scenario)); // 0.01 SUI

            verification_network::create_verification_task(
                &mut network,
                content_id,
                payment,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(network);
        };

        // Verify task created
        ts::next_tx(&mut scenario, REQUESTER);
        {
            let task = ts::take_shared<VerificationTask>(&scenario);

            assert!(!verification_network::is_task_finalized(&task), 0);

            ts::return_shared(task);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    fun test_voting_and_consensus() {
        let mut scenario = setup_test();
        let mut clock = clock::create_for_testing(ts::ctx(&mut scenario));
        let content_id = object::id_from_address(@0xC0);

        // Register 3 verifiers
        ts::next_tx(&mut scenario, VERIFIER1);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            verification_network::register_verifier(&mut network, stake, &clock, ts::ctx(&mut scenario));
            ts::return_shared(network);
        };

        ts::next_tx(&mut scenario, VERIFIER2);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            verification_network::register_verifier(&mut network, stake, &clock, ts::ctx(&mut scenario));
            ts::return_shared(network);
        };

        ts::next_tx(&mut scenario, VERIFIER3);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let stake = mint_sui(MIN_STAKE, ts::ctx(&mut scenario));
            verification_network::register_verifier(&mut network, stake, &clock, ts::ctx(&mut scenario));
            ts::return_shared(network);
        };

        // Create verification task
        ts::next_tx(&mut scenario, REQUESTER);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let payment = mint_sui(30_000_000, ts::ctx(&mut scenario));
            verification_network::create_verification_task(&mut network, content_id, payment, &clock, ts::ctx(&mut scenario));
            ts::return_shared(network);
        };

        // Cast votes (2 for, 1 against)
        ts::next_tx(&mut scenario, VERIFIER1);
        {
            let mut verifier = ts::take_from_sender<Verifier>(&scenario);
            let mut task = ts::take_shared<VerificationTask>(&scenario);

            verification_network::cast_vote(&mut verifier, &mut task, true, &clock, ts::ctx(&mut scenario));

            ts::return_to_sender(&scenario, verifier);
            ts::return_shared(task);
        };

        ts::next_tx(&mut scenario, VERIFIER2);
        {
            let mut verifier = ts::take_from_sender<Verifier>(&scenario);
            let mut task = ts::take_shared<VerificationTask>(&scenario);

            verification_network::cast_vote(&mut verifier, &mut task, true, &clock, ts::ctx(&mut scenario));

            ts::return_to_sender(&scenario, verifier);
            ts::return_shared(task);
        };

        ts::next_tx(&mut scenario, VERIFIER3);
        {
            let mut verifier = ts::take_from_sender<Verifier>(&scenario);
            let mut task = ts::take_shared<VerificationTask>(&scenario);

            verification_network::cast_vote(&mut verifier, &mut task, false, &clock, ts::ctx(&mut scenario));

            ts::return_to_sender(&scenario, verifier);
            ts::return_shared(task);
        };

        // Advance time past voting period
        clock::increment_for_testing(&mut clock, 86_400_001);

        // Finalize task
        ts::next_tx(&mut scenario, REQUESTER);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let mut task = ts::take_shared<VerificationTask>(&scenario);

            verification_network::finalize_task(&mut network, &mut task, &clock, ts::ctx(&mut scenario));

            assert!(verification_network::is_task_finalized(&task), 0);
            assert!(verification_network::get_task_result(&task) == true, 1); // Majority voted true

            ts::return_shared(network);
            ts::return_shared(task);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }

    #[test]
    #[expected_failure(abort_code = truthchain::verification_network::E_INSUFFICIENT_STAKE)]
    fun test_insufficient_stake_fails() {
        let mut scenario = setup_test();
        let clock = clock::create_for_testing(ts::ctx(&mut scenario));

        ts::next_tx(&mut scenario, VERIFIER1);
        {
            let mut network = ts::take_shared<VerificationNetwork>(&scenario);
            let stake = mint_sui(MIN_STAKE - 1, ts::ctx(&mut scenario)); // Less than minimum

            verification_network::register_verifier(
                &mut network,
                stake,
                &clock,
                ts::ctx(&mut scenario)
            );

            ts::return_shared(network);
        };

        clock::destroy_for_testing(clock);
        ts::end(scenario);
    }
}
