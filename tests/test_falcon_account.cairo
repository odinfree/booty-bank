use pqbench_falcon_512::fixtures::shake;
use private_creator_account::falcon_account::{
    IBootyFalconAccountDispatcher, IBootyFalconAccountDispatcherTrait, ISRC5_ID, ISRC6_ID,
};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, declare, start_cheat_caller_address,
    start_cheat_signature, start_cheat_transaction_hash, start_cheat_transaction_version,
};

fn direct_signature() -> Array<felt252> {
    let mut signature = array![];
    let mut prefix = shake::signature().span().slice(0, 31);
    while let Some(felt) = prefix.pop_front() {
        signature.append(*felt);
    }
    signature
}

fn deploy_account() -> IBootyFalconAccountDispatcher {
    let mut calldata = array![];
    shake::public_key().serialize(ref calldata);
    let contract = declare("BootyFalconAccount").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@calldata).unwrap();
    IBootyFalconAccountDispatcher { contract_address }
}

#[test]
fn accepts_genuine_falcon_signature_and_exposes_account_interfaces() {
    let account = deploy_account();

    assert(account.get_public_key().span() == shake::public_key().span(), 'BAD_PUBLIC_KEY');
    assert(account.supports_interface(ISRC5_ID), 'NO_SRC5');
    assert(account.supports_interface(ISRC6_ID), 'NO_SRC6');
    assert(!account.supports_interface(0xdead), 'BAD_INTERFACE');
    assert(
        account.is_valid_signature(shake::msg(), direct_signature()) == starknet::VALIDATED,
        'FALCON_REJECTED',
    );
    assert(account.is_valid_signature('WRONG_MSG', direct_signature()) == 0, 'BAD_MSG_ACCEPTED');
}

#[test]
fn validates_transaction_context_with_falcon_signature() {
    let account = deploy_account();
    start_cheat_transaction_hash(account.contract_address, shake::msg());
    let signature = direct_signature();
    start_cheat_signature(account.contract_address, signature.span());

    assert(account.__validate__(array![]) == starknet::VALIDATED, 'INVOKE_NOT_VALIDATED');
    assert(account.__validate_declare__(0x123) == starknet::VALIDATED, 'DECLARE_NOT_VALIDATED');
}

#[test]
#[should_panic(expected: 'ACCOUNT_BAD_SIG')]
fn rejects_invalid_transaction_signature() {
    let account = deploy_account();
    start_cheat_transaction_hash(account.contract_address, 'WRONG_MSG');
    let signature = direct_signature();
    start_cheat_signature(account.contract_address, signature.span());
    account.__validate__(array![]);
}

#[test]
#[should_panic(expected: 'ACCOUNT_BAD_CALLER')]
fn rejects_execute_from_contract_caller() {
    let account = deploy_account();
    start_cheat_caller_address(account.contract_address, 0x123.try_into().unwrap());
    account.__execute__(array![]);
}

#[test]
#[should_panic(expected: 'ACCOUNT_BAD_VERSION')]
fn rejects_legacy_transaction_version() {
    let account = deploy_account();
    start_cheat_caller_address(account.contract_address, 0.try_into().unwrap());
    start_cheat_transaction_version(account.contract_address, 0);
    account.__execute__(array![]);
}
