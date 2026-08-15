//! Falcon-512 account used by the Booty Bank demo.
//!
//! The account validates the compact SHAKE-256 direct signature layout from the pinned
//! OpenZeppelin `cairo-pq-verifiers` package. It stores a 29-felt packed Falcon public key,
//! checks transaction signatures inside the Starknet account validation path, and exposes
//! the standard account execution and signature-checking entrypoints.

use starknet::account::Call;

pub const ISRC5_ID: felt252 = 0x3f918d17e5ee77373b56385708f855659a07f75997f365cf87748628532a055;
pub const ISRC6_ID: felt252 = 0x2ceccef7f994940b3962a6c67e0ba4fcd37df7d131417c604f91e03caecc1cd;

#[starknet::interface]
pub trait IBootyFalconAccount<TState> {
    fn __execute__(self: @TState, calls: Array<Call>);
    fn __validate__(self: @TState, calls: Array<Call>) -> felt252;
    fn __validate_declare__(self: @TState, class_hash: felt252) -> felt252;
    fn __validate_deploy__(
        self: @TState,
        class_hash: felt252,
        contract_address_salt: felt252,
        public_key: Array<felt252>,
    ) -> felt252;
    fn is_valid_signature(self: @TState, hash: felt252, signature: Array<felt252>) -> felt252;
    fn supports_interface(self: @TState, interface_id: felt252) -> bool;
    fn get_public_key(self: @TState) -> Array<felt252>;
}

#[starknet::contract(account)]
pub mod BootyFalconAccount {
    use core::num::traits::Zero;
    use pqbench_falcon_512::{Falcon512ShakeDirectVerifier, PUBKEY_FELTS};
    use starknet::SyscallResultTrait;
    use starknet::account::Call;
    use starknet::storage::{MutableVecTrait, StoragePointerReadAccess, Vec, VecTrait};
    use super::{IBootyFalconAccount, ISRC5_ID, ISRC6_ID};

    const MIN_TRANSACTION_VERSION: u256 = 1;
    const QUERY_OFFSET: u256 = 0x100000000000000000000000000000000;

    pub mod errors {
        pub const INVALID_CALLER: felt252 = 'ACCOUNT_BAD_CALLER';
        pub const INVALID_TX_VERSION: felt252 = 'ACCOUNT_BAD_VERSION';
        pub const INVALID_SIGNATURE: felt252 = 'ACCOUNT_BAD_SIG';
        pub const INVALID_PUBLIC_KEY: felt252 = 'ACCOUNT_BAD_KEY';
    }

    #[storage]
    struct Storage {
        public_key: Vec<felt252>,
    }

    #[constructor]
    fn constructor(ref self: ContractState, public_key: Array<felt252>) {
        assert(public_key.len() == PUBKEY_FELTS, errors::INVALID_PUBLIC_KEY);
        for felt in public_key {
            self.public_key.push(felt);
        }
    }

    #[abi(embed_v0)]
    impl AccountImpl of IBootyFalconAccount<ContractState> {
        fn __execute__(self: @ContractState, calls: Array<Call>) {
            assert_protocol_caller();
            assert_valid_tx_version();
            for call in calls {
                starknet::syscalls::call_contract_syscall(call.to, call.selector, call.calldata)
                    .unwrap_syscall();
            }
        }

        fn __validate__(self: @ContractState, calls: Array<Call>) -> felt252 {
            let _ = calls;
            self.validate_transaction()
        }

        fn __validate_declare__(self: @ContractState, class_hash: felt252) -> felt252 {
            let _ = class_hash;
            self.validate_transaction()
        }

        fn __validate_deploy__(
            self: @ContractState,
            class_hash: felt252,
            contract_address_salt: felt252,
            public_key: Array<felt252>,
        ) -> felt252 {
            let _ = class_hash;
            let _ = contract_address_salt;
            let _ = public_key;
            self.validate_transaction()
        }

        fn is_valid_signature(
            self: @ContractState, hash: felt252, signature: Array<felt252>,
        ) -> felt252 {
            if Falcon512ShakeDirectVerifier::verify(
                hash, self.read_public_key().span(), signature.span(),
            ) {
                starknet::VALIDATED
            } else {
                0
            }
        }

        fn supports_interface(self: @ContractState, interface_id: felt252) -> bool {
            interface_id == ISRC5_ID || interface_id == ISRC6_ID
        }

        fn get_public_key(self: @ContractState) -> Array<felt252> {
            self.read_public_key()
        }
    }

    #[generate_trait]
    impl InternalImpl of InternalTrait {
        fn validate_transaction(self: @ContractState) -> felt252 {
            let tx_info = starknet::get_tx_info().unbox();
            assert(
                Falcon512ShakeDirectVerifier::verify(
                    tx_info.transaction_hash, self.read_public_key().span(), tx_info.signature,
                ),
                errors::INVALID_SIGNATURE,
            );
            starknet::VALIDATED
        }

        fn read_public_key(self: @ContractState) -> Array<felt252> {
            let mut key = array![];
            let len = self.public_key.len();
            let mut index = 0;
            while index != len {
                key.append(self.public_key.at(index).read());
                index += 1;
            }
            key
        }
    }

    fn assert_protocol_caller() {
        assert(starknet::get_caller_address().is_zero(), errors::INVALID_CALLER);
    }

    fn assert_valid_tx_version() {
        let tx_info = starknet::get_tx_info().unbox();
        let tx_version: u256 = tx_info.version.into();
        if tx_version >= QUERY_OFFSET {
            assert(
                QUERY_OFFSET + MIN_TRANSACTION_VERSION <= tx_version, errors::INVALID_TX_VERSION,
            );
        } else {
            assert(MIN_TRANSACTION_VERSION <= tx_version, errors::INVALID_TX_VERSION);
        }
    }
}
