use starknet::ContractAddress;
pub mod falcon_account;

#[derive(Drop, Serde, Copy)]
pub struct IncomeCredentialView {
    pub data_commitment: felt252,
    pub valid_until: u64,
    pub version: u64,
    pub revoked: bool,
}

#[starknet::interface]
pub trait IIncomeCredential<TState> {
    fn publish(
        ref self: TState,
        creator_nullifier: felt252,
        data_commitment: felt252,
        valid_until: u64,
        version: u64,
    );
    fn revoke(ref self: TState, creator_nullifier: felt252);
    fn rotate_verifier(ref self: TState, new_verifier: ContractAddress);
    fn get_verifier(self: @TState) -> ContractAddress;
    fn get_credential(self: @TState, creator_nullifier: felt252) -> IncomeCredentialView;
    fn is_active(self: @TState, creator_nullifier: felt252) -> bool;
}

#[starknet::contract]
pub mod IncomeCredential {
    use core::num::traits::Zero;
    use starknet::storage::{
        Map, StoragePathEntry, StoragePointerReadAccess, StoragePointerWriteAccess,
    };
    use starknet::{ContractAddress, get_block_timestamp, get_caller_address};
    use super::IncomeCredentialView;

    pub const MAX_VALIDITY: u64 = 7_776_000; // 90 days.

    pub mod errors {
        pub const ZERO_VERIFIER: felt252 = 'ZERO_VERIFIER';
        pub const ONLY_VERIFIER: felt252 = 'ONLY_VERIFIER';
        pub const ZERO_NULLIFIER: felt252 = 'ZERO_NULLIFIER';
        pub const ZERO_COMMITMENT: felt252 = 'ZERO_COMMITMENT';
        pub const INVALID_EXPIRY: felt252 = 'INVALID_EXPIRY';
        pub const EXPIRY_TOO_LONG: felt252 = 'EXPIRY_TOO_LONG';
        pub const ZERO_VERSION: felt252 = 'ZERO_VERSION';
        pub const VERSION_NOT_NEW: felt252 = 'VERSION_NOT_NEW';
        pub const NOT_FOUND: felt252 = 'NOT_FOUND';
    }

    #[storage]
    struct Storage {
        verifier: ContractAddress,
        data_commitment: Map<felt252, felt252>,
        valid_until: Map<felt252, u64>,
        version: Map<felt252, u64>,
        revoked: Map<felt252, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    pub enum Event {
        CredentialPublished: CredentialPublished,
        CredentialRevoked: CredentialRevoked,
        VerifierRotated: VerifierRotated,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialPublished {
        #[key]
        pub creator_nullifier: felt252,
        #[key]
        pub data_commitment: felt252,
        pub valid_until: u64,
        pub version: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct CredentialRevoked {
        #[key]
        pub creator_nullifier: felt252,
        pub version: u64,
    }

    #[derive(Drop, starknet::Event)]
    pub struct VerifierRotated {
        #[key]
        pub previous_verifier: ContractAddress,
        #[key]
        pub new_verifier: ContractAddress,
    }

    #[constructor]
    fn constructor(ref self: ContractState, verifier: ContractAddress) {
        assert(verifier.is_non_zero(), errors::ZERO_VERIFIER);
        self.verifier.write(verifier);
    }

    fn assert_verifier(self: @ContractState) {
        assert(get_caller_address() == self.verifier.read(), errors::ONLY_VERIFIER);
    }

    #[abi(embed_v0)]
    impl IncomeCredentialImpl of super::IIncomeCredential<ContractState> {
        fn publish(
            ref self: ContractState,
            creator_nullifier: felt252,
            data_commitment: felt252,
            valid_until: u64,
            version: u64,
        ) {
            assert_verifier(@self);
            assert(creator_nullifier != 0, errors::ZERO_NULLIFIER);
            assert(data_commitment != 0, errors::ZERO_COMMITMENT);
            assert(version != 0, errors::ZERO_VERSION);

            let now = get_block_timestamp();
            assert(valid_until > now, errors::INVALID_EXPIRY);
            assert(valid_until <= now + MAX_VALIDITY, errors::EXPIRY_TOO_LONG);

            let current_version = self.version.entry(creator_nullifier).read();
            assert(version > current_version, errors::VERSION_NOT_NEW);

            self.data_commitment.entry(creator_nullifier).write(data_commitment);
            self.valid_until.entry(creator_nullifier).write(valid_until);
            self.version.entry(creator_nullifier).write(version);
            self.revoked.entry(creator_nullifier).write(false);
            self
                .emit(
                    CredentialPublished {
                        creator_nullifier, data_commitment, valid_until, version,
                    },
                );
        }

        fn revoke(ref self: ContractState, creator_nullifier: felt252) {
            assert_verifier(@self);
            let version = self.version.entry(creator_nullifier).read();
            assert(version != 0, errors::NOT_FOUND);
            self.revoked.entry(creator_nullifier).write(true);
            self.emit(CredentialRevoked { creator_nullifier, version });
        }

        fn rotate_verifier(ref self: ContractState, new_verifier: ContractAddress) {
            assert_verifier(@self);
            assert(new_verifier.is_non_zero(), errors::ZERO_VERIFIER);
            let previous_verifier = self.verifier.read();
            self.verifier.write(new_verifier);
            self.emit(VerifierRotated { previous_verifier, new_verifier });
        }

        fn get_verifier(self: @ContractState) -> ContractAddress {
            self.verifier.read()
        }

        fn get_credential(
            self: @ContractState, creator_nullifier: felt252,
        ) -> IncomeCredentialView {
            IncomeCredentialView {
                data_commitment: self.data_commitment.entry(creator_nullifier).read(),
                valid_until: self.valid_until.entry(creator_nullifier).read(),
                version: self.version.entry(creator_nullifier).read(),
                revoked: self.revoked.entry(creator_nullifier).read(),
            }
        }

        fn is_active(self: @ContractState, creator_nullifier: felt252) -> bool {
            let version = self.version.entry(creator_nullifier).read();
            let valid_until = self.valid_until.entry(creator_nullifier).read();
            version != 0
                && !self.revoked.entry(creator_nullifier).read()
                && valid_until > get_block_timestamp()
        }
    }
}
