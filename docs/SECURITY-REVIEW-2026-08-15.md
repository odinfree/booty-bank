# Security review 2026-08-15

Scope

- `src/falcon_account.cairo`
- `src/lib.cairo`

The review used four Cairo attack-vector partitions covering access control and upgrades, external calls and reentrancy, economic logic, and storage and trust chains.

## Closed findings

| Priority | Finding | Fix | Regression coverage |
|---|---|---|---|
| P0 | Falcon signing authority could not rotate | Added self-call-only public-key rotation, versioned state, and a rotation event | External rotation fails, the former key fails, and a restored valid key succeeds |
| P1 | Credential verifier authority could not rotate | Added verifier-only authority rotation with zero-address rejection and an event | The replacement verifier publishes and the former verifier fails |

The other three vector partitions returned no finding that passed the false-positive gate.

## Test gate

- 22 Cairo tests pass.
- The account accepts a valid Falcon-512 signature and rejects tampering.
- Contract callers cannot enter the execution path.
- Legacy transaction versions fail.
- Credential versions, expiry, revocation, caller authorization, and verifier rotation have regression tests.

## Open release gates

The repository review does not replace an independent audit. The Falcon verifier dependency is experimental. A separate post-quantum recovery policy, signer integration, Sepolia deployment, and independent audit remain mandatory before mainnet use.
