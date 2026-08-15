# Private Creator Account

A separate STRK20 prototype for OnlyFans income evidence and private credit eligibility. This repository does not replace or rewrite Mosby Pass.

## What this proves

- A creator can consent to an offchain income review.
- A verifier can publish a minimal, expiring credential on Starknet.
- Exact earnings, platform identity, legal identity, and underwriting evidence stay offchain.
- A deterministic UI can preview whether the evidence is ready for lender review.

## What this does not provide

This prototype does not open a bank account, hold deposits, issue a card, make a credit decision, lend money, or offer investments. No OnlyFans data provider, bank, underwriter, or lender is integrated or represented as a partner. The project is not affiliated with OnlyFans.

## Contract

`IncomeCredential` stores only:

- creator nullifier
- data commitment
- expiry
- monotonically increasing version
- revocation state

Only the configured verifier can publish or revoke. Credentials expire within 90 days. Public transaction timing and the nullifier remain observable; batching or a relayer would be required to reduce timing leakage.

## Local verification

```sh
scarb fmt --check
scarb build
snforge test
cd web
npm ci
npm audit --audit-level=high
npm run typecheck
npm test
npm run build
```

## Activation gates

Before any banking or credit language leaves prototype status, obtain written confirmation from:

1. A regulated bank or EMI that accepts OnlyFans creators.
2. A consented data provider that confirms the required OnlyFans income fields.
3. A licensed lender willing to underwrite a bounded pilot.
4. Privacy and compliance counsel reviewing the end-to-end data flow.
