use booty_bank::falcon_account::{
    IBootyFalconAccountDispatcher, IBootyFalconAccountDispatcherTrait, ISRC5_ID, ISRC6_ID,
};
use pqbench_falcon_512::fixtures::{blake, shake};
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
    assert(account.get_key_version() == 1, 'BAD_KEY_VERSION');
}

#[test]
fn authenticated_self_call_rotates_falcon_key() {
    let account = deploy_account();
    assert(
        account.is_valid_signature(shake::msg(), direct_signature()) == starknet::VALIDATED,
        'INITIAL_KEY_INVALID',
    );

    start_cheat_caller_address(account.contract_address, account.contract_address);
    account.rotate_public_key(blake::public_key());
    assert(account.get_public_key().span() == blake::public_key().span(), 'ROTATION_FAILED');
    assert(account.get_key_version() == 2, 'VERSION_NOT_BUMPED');
    assert(account.is_valid_signature(shake::msg(), direct_signature()) == 0, 'OLD_KEY_ACTIVE');

    account.rotate_public_key(shake::public_key());
    assert(account.get_key_version() == 3, 'SECOND_VERSION_BAD');
    assert(
        account.is_valid_signature(shake::msg(), direct_signature()) == starknet::VALIDATED,
        'RESTORED_KEY_INVALID',
    );
}

#[test]
#[should_panic(expected: 'ROTATION_NOT_SELF')]
fn rejects_public_key_rotation_from_external_caller() {
    let account = deploy_account();
    start_cheat_caller_address(account.contract_address, 0x123.try_into().unwrap());
    account.rotate_public_key(blake::public_key());
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
