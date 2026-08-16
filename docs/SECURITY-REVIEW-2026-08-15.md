# Security review 2026-08-15

Scope

- `src/falcon_account.cairo`
- `src/lib.cairo`
- `web/src`
- `worker/src`

The review covered Cairo account authorization, browser wallet and quote paths, Privy boundaries, waitlist storage, request handling, and public claim accuracy. Each accepted finding received a code fix and a regression check in the same release.

## Closed findings

| Priority | Finding | Fix | Regression coverage |
|---|---|---|---|
| P0 | Falcon rotation could replace the only key without showing control of the new key | Rotation now requires a transaction signature from the current key and a second signature from the proposed key | Valid dual-signature rotation passes. Missing and mismatched proposed-key signatures fail |
| P1 | Credential verifier authority could not rotate | Added verifier-only authority rotation with zero-address rejection and an event | The replacement verifier publishes and the former verifier fails |
| P0 | Privy exposed arbitrary hash signing to an authenticated browser | Removed the raw-sign route and active browser integration | The former signing path returns no signing capability |
| P1 | AVNU builder output could reach wallet execution without an independent call policy | Added an exact chain/router/approval/token/amount/recipient/minimum-output/fee policy before execution | Mutation tests reject altered calls; execution refetches the quote and rechecks wallet identity |
| P1 | Request limits were checked after buffering and the waitlist had no edge quota | Added bounded streaming and a five-attempt-per-minute Cloudflare rate-limit binding | Lengthless oversized streams fail before parsing. Excess requests fail before D1 writes |

No SQL injection, credential disclosure, cross-user wallet lookup, contract-caller account bypass, or deployed Falcon account was found.

## Test gate

- 28 Cairo tests pass.
- 19 web tests pass.
- 12 Worker tests pass.
- The account accepts a valid Falcon-512 signature and rejects tampering.
- Contract callers cannot enter the execution path.
- Legacy transaction versions fail.
- Key rotation requires current-key authorization and proposed-key possession.
- Credential versions, expiry, revocation, caller authorization, and verifier rotation have regression coverage.
- Web and Worker production builds pass with zero dependency-audit findings.

## Open release gates

This repository review does not replace an independent audit. The Falcon verifier dependency is experimental. The account has not been deployed. A separate post-quantum recovery policy, signer integration, Sepolia deployment, and independent audit remain required before mainnet use.

The waitlist stores an address after form submission without proving control of that inbox. Double opt-in must ship before the list sends email. Privy wallet creation stays dormant until a typed transaction policy binds chain, account, nonce, calls, limits, expiry, and visible user approval.

The current rotation fixture verifies both signature slots with one SHAKE-compatible key and rejects a mismatched proposed-key signature. A second genuine SHAKE-compatible fixture is still required to demonstrate a successful handoff between distinct keys and rejection of the former key after rotation.
