# Booty Bank

> BORROW AGAINST YOUR BBL.

Booty Bank is the primary money account built for OnlyFans creators. The product combines daily banking, creator income, private credit, fan perks, and a post-quantum-ready Starknet account contract.

The goal is one account. A creator should not need Revolut beside it.

[Open the interactive demo](https://bootybank.app/)

Booty Bank is a hackathon prototype. It is not a licensed bank, is not affiliated with OnlyFans or Revolut, and does not issue accounts or cards, make credit decisions, or execute investments. The connected STRK20 rail can submit real wallet-approved transactions; the sample banking controls cannot.

## Product demo

The app has seven working areas.

- Home shows total balance, activity, the next creator payout, automatic payout splits, and card status.
- Payments covers peer and bank transfers, requests, payment links, direct debits, and scheduled payments.
- Cards includes physical, virtual, disposable, and fan-card surfaces with freeze, online-spend, ATM, and limit controls.
- Plan handles pockets, budgets, payout rules, tax allocation, and spend analytics.
- Wealth combines cash, savings, net worth, and recurring investment controls.
- Creator connects payout sources, creates a minimum lender packet, and runs fan rewards, drops, and creator-share programs.
- Privacy controls disclosure, account authorization, shielded-money status, and the data-access log.

The demo supports working interactions for balance redaction, navigation, transfers, exchange, card controls, payout automation, creator advances, and privacy review. Its Starknet rail is real: wallets connect through wallet-standard Get Starknet v6, public balances are read onchain, and AVNU returns live STRK-to-USDC quotes. A fresh quote can execute only after Booty Bank independently validates the chain, router, approval, tokens, amount, recipient, minimum output, and fee fields in every builder-returned call. Mainnet swaps use AVNU's pay-gas-in-STRK mode. Sepolia paymaster RPC uses Booty Bank's server-side gas-free proxy. Ready or Xverse can expose the [STRK20 Starknet Wallet API](https://strk20.starknet.io/docs/starknet-wallet-api/overview) for private balances, shield, private transfer, unshield, simulation, proof generation, and submission. Booty Bank never receives a viewing key. Every fiat rail that needs a licensed operator is labelled `PARTNER` or `ROADMAP`.

The same wallet session derives a deterministic Booty Bank shadow account and distinguishes `DEPLOYED` from `FUNDABLE BEFORE DEPLOYMENT`. Shadow-account execution and a payout-specific anonymizer remain gated work; the interface does not claim they are live.

Privy social login and owner-bound Starknet wallet creation are wired behind deployment configuration. With no public Privy App ID, the interface falls back to the labelled preview. When configured, Google or email login produces a short-lived access token, the Worker verifies it, and the user can explicitly create or recover the same Privy-owned Starknet wallet. No browser signing endpoint exists. Activation details are in [Privy integration](docs/PRIVY-INTEGRATION.md).

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
- SRC5 and SRC6 interface discovery
- contract-caller and legacy-version rejection
- key rotation with old-key authorization and new-key proof of possession

The test suite accepts a valid Falcon signature, rejects message tampering, verifies the dual-signature rotation path, rejects missing or mismatched new-key proofs, and blocks external callers from rotating account authority.

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

The current local run passes 28 Cairo tests, 23 web tests, and 12 Worker tests. The production web export compiles successfully and is visually checked at 390px, 790px, and 1440px widths.

## Production deployment

The static Next.js export is deployed by GitHub Actions to GitHub Pages. `https://bootybank.app` is the canonical production URL. Cloudflare manages authoritative DNS, edge HTTPS, and the permanent `www` redirect. The existing GitHub Pages URL remains a working entry point and local development still runs with `npm run dev` from `web/`.

The launch waitlist posts to a narrowly routed Cloudflare Worker at `/api/waitlist`. A Cloudflare edge binding limits each client to five attempts per minute before D1 work begins. Signups are stored in the EU-jurisdiction D1 database `booty-bank-waitlist`; only the normalized email address and signup timestamp are retained. The same Worker contains the dormant authenticated Privy wallet-creation endpoint at `/api/wallet/starknet`. It stores the Privy user-to-wallet mapping, public key, and public address; it never stores a private key or access token and exposes no raw-sign endpoint.

The Worker also proxies AVNU paymaster JSON-RPC at `/api/paymaster`. The API key is a Worker secret and never reaches the browser. The public endpoint is Sepolia-only, accepts four explicit paymaster methods, rejects user-paid modes, caps request bodies, enforces the Booty Bank origin list, and reuses the edge rate limiter with a separate key prefix. Mainnet project-sponsored gas remains disabled; no prepaid credits are consumed by this integration.

For local development, copy `web/.env.example` to `web/.env.local`, run `npm run dev` in `worker/`, and run the web app from `web/`. Apply schema changes with `npx wrangler d1 execute booty-bank-waitlist --remote --file schema.sql` before deploying the Worker.

Privy wallet-creation activation needs two values that are intentionally absent from tracked files:

- Cloudflare Worker secret `PRIVY_APP_ID`
- Cloudflare Worker secret `PRIVY_APP_SECRET`

Set Worker secrets with `npx wrangler secret put`; never add them to `wrangler.jsonc`. Social login becomes live when both the web identifier and Worker credentials are configured. Raw signing remains closed until the transaction policy and a fresh security review pass.

The static web build also reads public GitHub Actions repository variables `NEXT_PUBLIC_PRIVY_APP_ID` and the optional `NEXT_PUBLIC_PRIVY_CLIENT_ID`. These are identifiers, not secrets. Until they are set, production keeps the honest preview while the existing wallet and STRK20 paths continue working.

## Launch gates

Booty Bank needs written agreements with a regulated bank or EMI, a card issuer and processor, a consented creator-income provider, a licensed lender, and a regulated investment provider. Privacy and compliance counsel must review the complete data flow before any creator deposits money or submits a credit application.

The [privacy and post-quantum build map](docs/PRIVACY-AND-PQ-ROADMAP.md) separates code that exists now from partner work and planned privacy upgrades.

## Credits

- OnlyFans neobank concept by [@Metachaser24](https://x.com/Metachaser24/status/2088277057457225901?s=20)
- "Borrow against your BBL" by [@NoRampLabs](https://x.com/NoRampLabs/status/2088575905962549667?s=20)
- Brought to our attention by [@8am1am](https://x.com/8am1am)
- Starknet privacy inspection and shadow-account research informed by [Amanusk's snbeat](https://github.com/amanusk/snbeat)
