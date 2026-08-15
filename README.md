# Booty Bank

> BORROW AGAINST YOUR BBL.

Booty Bank is the primary money account built for OnlyFans creators. The product combines daily banking, creator income, private credit, fan perks, and post-quantum Starknet account authorization.

The goal is one account. A creator should not need Revolut beside it.

[Open the interactive demo](https://welttowelt.github.io/booty-bank/)

Booty Bank is a hackathon prototype. It is not a licensed bank, is not affiliated with OnlyFans or Revolut, and does not move funds, issue cards, make credit decisions, or execute investments.

## Product demo

The app has seven working areas.

- Home shows total balance, activity, the next creator payout, automatic payout splits, and card status.
- Payments covers peer and bank transfers, requests, payment links, direct debits, and scheduled payments.
- Cards includes physical, virtual, disposable, and fan-card surfaces with freeze, online-spend, ATM, and limit controls.
- Plan handles pockets, budgets, payout rules, tax allocation, and spend analytics.
- Wealth combines cash, savings, net worth, and recurring investment controls.
- Creator connects payout sources, creates a minimum lender packet, and runs fan rewards, drops, and creator-share programs.
- Privacy controls disclosure, account authorization, shielded-money status, and the data-access log.

The demo supports working interactions for balance redaction, navigation, transfers, exchange, card controls, payout automation, creator advances, and privacy review. Every financial rail that needs a licensed operator is labelled `PARTNER` or `ROADMAP`.

The account surface takes its functional benchmark from [Revolut's account, transfer, card, budgeting, and investment categories](https://help.revolut.com/en-CH/help/). Creator cards, fan rewards, community revenue, and drops take their functional benchmark from [Ready](https://www.ready.co/). Booty Bank uses its own product structure and visual system.

See [Primary account UX](docs/PRIMARY-ACCOUNT-UX.md) for the full interaction map.

## Cairo contracts

`IncomeCredential` publishes the minimum public credential needed for an income review.

- creator nullifier
- data commitment
- expiry
- monotonically increasing version
- revocation state

The platform, creator handle, legal identity, exact payouts, and underwriting file stay offchain. Only the active verifier can publish or revoke credentials. The verifier can hand authority to a replacement address, and the old verifier loses access immediately.

`BootyFalconAccount` is a deployable Starknet account contract using Falcon-512 with the SHAKE-256 direct verifier pinned from [OpenZeppelin cairo-pq-verifiers](https://github.com/OpenZeppelin/cairo-pq-verifiers) at commit `bece5c07eeea5784e570c01108ec000d2d04ae40`.

- 29-felt packed Falcon public key
- 31-felt direct signature layout
- invoke, declare, and deploy-account validation
- SRC5 and SNIP-6 support
- contract-caller and legacy-version rejection
- authenticated self-call key rotation with versioned events

The test suite accepts a valid Falcon signature, rejects message tampering, rotates the public key, rejects the former key, and blocks external callers from rotating account authority.

The Falcon code is experimental and has not received an independent audit. The current target is Starknet Sepolia. Mainnet stays closed until an audit is complete and a separate post-quantum recovery policy works.

## Verification

The repository pins Scarb `2.18.0` and Starknet Foundry `0.59.0`.

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

The current local run passes 22 Cairo tests and 9 web tests. The production web export compiles successfully at desktop and mobile widths.

## Launch gates

Booty Bank needs written agreements with a regulated bank or EMI, a card issuer and processor, a consented creator-income provider, a licensed lender, and a regulated investment provider. Privacy and compliance counsel must review the complete data flow before any creator deposits money or submits a credit application.

The [privacy and post-quantum build map](docs/PRIVACY-AND-PQ-ROADMAP.md) separates code that exists now from partner work and planned privacy upgrades.

## Credits

- OnlyFans neobank concept by [@Metachaser24](https://x.com/Metachaser24/status/2088277057457225901?s=20)
- "Borrow against your BBL" by [@NoRampLabs](https://x.com/NoRampLabs/status/2088575905962549667?s=20)
- Brought to our attention by [@8am1am](https://x.com/8am1am)
