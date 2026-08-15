use private_creator_account::IncomeCredential::{CredentialPublished, Event, MAX_VALIDITY};
use private_creator_account::{IIncomeCredentialDispatcher, IIncomeCredentialDispatcherTrait};
use snforge_std::{
    ContractClassTrait, DeclareResultTrait, EventSpyAssertionsTrait, declare, spy_events,
    start_cheat_block_timestamp, start_cheat_caller_address,
};
use starknet::ContractAddress;

const NOW: u64 = 1_786_780_000;

fn addr(value: felt252) -> ContractAddress {
    value.try_into().unwrap()
}

fn setup() -> (ContractAddress, IIncomeCredentialDispatcher) {
    let verifier = addr(0x501);
    let contract = declare("IncomeCredential").unwrap().contract_class();
    let (contract_address, _) = contract.deploy(@array![verifier.into()]).unwrap();
    start_cheat_block_timestamp(contract_address, NOW);
    start_cheat_caller_address(contract_address, verifier);
    (verifier, IIncomeCredentialDispatcher { contract_address })
}

#[test]
fn publishes_minimal_credential_and_emits_event() {
    let (verifier, credential) = setup();
    let nullifier = 0x771;
    let commitment = 0xc01;
    let expiry = NOW + 30 * 24 * 60 * 60;
    let mut spy = spy_events();

    credential.publish(nullifier, commitment, expiry, 1);

    let stored = credential.get_credential(nullifier);
    assert(stored.data_commitment == commitment, 'BAD_COMMITMENT');
    assert(stored.valid_until == expiry, 'BAD_EXPIRY');
    assert(stored.version == 1, 'BAD_VERSION');
    assert(!stored.revoked, 'BAD_REVOKED');
    assert(credential.is_active(nullifier), 'NOT_ACTIVE');
    assert(credential.get_verifier() == verifier, 'BAD_VERIFIER');
    spy
        .assert_emitted(
            @array![
                (
                    credential.contract_address,
                    Event::CredentialPublished(
                        CredentialPublished {
                            creator_nullifier: nullifier,
                            data_commitment: commitment,
                            valid_until: expiry,
                            version: 1,
                        },
                    ),
                ),
            ],
        );
}

#[test]
fn newer_version_replaces_commitment_and_clears_revocation() {
    let (_, credential) = setup();
    credential.publish(0x771, 0xc01, NOW + 1_000, 1);
    credential.revoke(0x771);
    credential.publish(0x771, 0xc02, NOW + 2_000, 2);

    let stored = credential.get_credential(0x771);
    assert(stored.data_commitment == 0xc02, 'BAD_COMMITMENT');
    assert(stored.version == 2, 'BAD_VERSION');
    assert(!stored.revoked, 'STILL_REVOKED');
}

#[test]
fn revocation_deactivates_credential() {
    let (_, credential) = setup();
    credential.publish(0x771, 0xc01, NOW + 1_000, 1);
    credential.revoke(0x771);
    assert(!credential.is_active(0x771), 'STILL_ACTIVE');
    assert(credential.get_credential(0x771).revoked, 'NOT_REVOKED');
}

#[test]
fn expiry_deactivates_credential() {
    let (_, credential) = setup();
    credential.publish(0x771, 0xc01, NOW + 100, 1);
    start_cheat_block_timestamp(credential.contract_address, NOW + 101);
    assert(!credential.is_active(0x771), 'STILL_ACTIVE');
}

#[test]
#[should_panic(expected: 'ONLY_VERIFIER')]
fn rejects_non_verifier() {
    let (_, credential) = setup();
    start_cheat_caller_address(credential.contract_address, addr(0xbad));
    credential.publish(0x771, 0xc01, NOW + 1_000, 1);
}

#[test]
fn verifier_can_rotate_authority() {
    let (_, credential) = setup();
    let new_verifier = addr(0x502);
    credential.rotate_verifier(new_verifier);

    assert(credential.get_verifier() == new_verifier, 'ROTATION_FAILED');
    start_cheat_caller_address(credential.contract_address, new_verifier);
    credential.publish(0x771, 0xc01, NOW + 1_000, 1);
    assert(credential.is_active(0x771), 'NEW_VERIFIER_BLOCKED');
}

#[test]
#[should_panic(expected: 'ONLY_VERIFIER')]
fn former_verifier_loses_authority_after_rotation() {
    let (verifier, credential) = setup();
    credential.rotate_verifier(addr(0x502));
    start_cheat_caller_address(credential.contract_address, verifier);
    credential.publish(0x771, 0xc01, NOW + 1_000, 1);
}

#[test]
#[should_panic(expected: 'ZERO_VERIFIER')]
fn verifier_rotation_rejects_zero_address() {
    let (_, credential) = setup();
    credential.rotate_verifier(addr(0));
}

#[test]
#[should_panic(expected: 'ZERO_NULLIFIER')]
fn rejects_zero_nullifier() {
    let (_, credential) = setup();
    credential.publish(0, 0xc01, NOW + 1_000, 1);
}

#[test]
#[should_panic(expected: 'ZERO_COMMITMENT')]
fn rejects_zero_commitment() {
    let (_, credential) = setup();
    credential.publish(0x771, 0, NOW + 1_000, 1);
}

#[test]
#[should_panic(expected: 'INVALID_EXPIRY')]
fn rejects_past_expiry() {
    let (_, credential) = setup();
    credential.publish(0x771, 0xc01, NOW, 1);
}

#[test]
#[should_panic(expected: 'EXPIRY_TOO_LONG')]
fn rejects_unbounded_expiry() {
    let (_, credential) = setup();
    credential.publish(0x771, 0xc01, NOW + MAX_VALIDITY + 1, 1);
}

#[test]
#[should_panic(expected: 'ZERO_VERSION')]
fn rejects_zero_version() {
    let (_, credential) = setup();
    credential.publish(0x771, 0xc01, NOW + 1_000, 0);
}

#[test]
#[should_panic(expected: 'VERSION_NOT_NEW')]
fn rejects_version_replay() {
    let (_, credential) = setup();
    credential.publish(0x771, 0xc01, NOW + 1_000, 1);
    credential.publish(0x771, 0xc02, NOW + 2_000, 1);
}

#[test]
#[should_panic(expected: 'NOT_FOUND')]
fn rejects_revocation_without_credential() {
    let (_, credential) = setup();
    credential.revoke(0x771);
}
