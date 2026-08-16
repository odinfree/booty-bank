# Mainnet app implementation contract

## Decision

`/app` becomes a real self-custodial Starknet Mainnet account. It must not render fabricated balances, activity, cards, payouts, income, or credit as user data. Every live amount comes from the connected account or a named external data source with a refresh timestamp.

The first credible release is intentionally narrow:

| Capability | Release state |
| --- | --- |
| External wallet connection | Live |
| Mainnet STRK, native USDC, ETH, and WBTC balances | Live |
| Receive | Live |
| Public Starknet send | Build now |
| AVNU bidirectional core-asset swap | Live with displayed-quote consent bound to execution |
| STRK20 shield, private send, and unshield | Live only when the connected wallet exposes the API |
| Privy embedded account | Configured preview until deploy, sign, recovery, and policy work end to end |
| Cards and creator payouts | Partner required |
| Credit | Calculator or partner-interest state only |
| Investments and fake fiat history | Remove from the live account |

## Route map

```text
/app/                    disconnected onboarding or connected overview
/app/assets/             STRK and USDC positions
/app/send/               reviewed public Starknet transfer
/app/receive/            address, copy, QR, and Mainnet warning
/app/swap/               AVNU quote, review, approval, and receipt
/app/privacy/            STRK20 balances and private actions
/app/cards/              partner availability
/app/payouts/            partner availability
/app/credit/             calculator and partner availability
/app/settings/           wallet, network, session, privacy display
/app/settings/security/  account and security status
```

Desktop navigation: Overview, Assets, Move, Privacy, More. Mobile navigation: Overview, Assets, Move, More. Transaction flows use full routes instead of header popovers.

## State architecture

- `wallet-session`: discover, connect, restore the exact account, disconnect, and invalidate on network or account change.
- `portfolio`: pinned token registry, RPC balances, refresh timestamp, loading, stale, and error states.
- `transactions`: draft, validating, simulating, awaiting approval, submitted, accepted, and reverted.
- `transfer`: recipient, token, amount, available balance, fee estimate, and simulation.
- `swap`: displayed quote, approved minimum, freshness, AVNU adapter, and independent call validation.
- `privacy`: STRK20 capability detection, balances, shadow account, and prepared-action snapshot.
- `availability`: `LIVE`, `CONFIGURED`, `PARTNER_REQUIRED`, `DEMO_TOOL`, or `UNAVAILABLE`.

Provider and account objects stay inside the wallet module. Routes consume typed snapshots and commands. Persist only the wallet identifier, exact address, privacy-display preference, and submitted transaction hashes. Never persist balances or inferred creator identity.

## Delivery commits

1. `refactor(app): replace demo dashboard with routed product shell`
   - Remove the fabricated dashboard from `/app`.
   - Add disconnected, connecting, wrong-network, connected, stale, and error layouts.
   - Keep the Booty Bank Helvetica, all-caps, borders, paper canvas, and restrained accent system.
2. `feat(wallet): add mainnet session and real portfolio routes`
   - Extract wallet discovery and restoration.
   - Ship overview, assets, and receive from real Mainnet state.
3. `feat(transfer): ship reviewed starknet send flow`
   - Validate, estimate, simulate, review, approve, submit, and track the receipt.
4. `fix(avnu): bind execution to displayed quote consent`
   - If the refreshed output falls below the approved 0.5% minimum, show the new quote and require another click.
5. `feat(privacy): promote strk20 into a full transaction route`
   - Preserve preview-before-submit and account-generation binding.
6. Add truthful partner routes, activate Privy only after full account controls exist, then run RCI and production verification.

## Security gates

- Mainnet is verified before every read and write.
- Token addresses are pinned; unsupported assets cannot enter calls.
- Drafts and previews die synchronously on account or network changes.
- A submitted transaction hash is not labelled settled until the receipt is accepted.
- Duplicate submission is blocked.
- The AVNU Worker remains read-only; anonymous sponsored execution stays closed.
- Future Privy signing requires an authenticated one-time intent bound to user, Mainnet chain, account, nonce, exact calls, expiry, and idempotency key.
- STRK20 proving and viewing keys remain in the wallet.

## Acceptance criteria

1. A disconnected visitor sees no fabricated financial state.
2. `/app` restores only the exact previously authorized wallet and account.
3. Non-Mainnet sessions cannot execute.
4. Overview and Assets show only RPC-derived balances with refresh and failure states.
5. Receive shows the exact connected address and a Mainnet warning.
6. Send simulates, reviews, submits, and links a real transaction.
7. AVNU cannot execute below the user-approved minimum without renewed consent.
8. STRK20 actions preview before submission and invalidate on session changes.
9. Partner products contain no dead controls or simulated success messages.
10. At 390, 790, and 1440 pixels: no horizontal overflow, visible focus, complete privacy masking, and safe stale/revert/duplicate-submit states.
