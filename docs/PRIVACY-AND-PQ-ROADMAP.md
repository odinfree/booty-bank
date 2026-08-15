# Booty Bank build map

Booty Bank is a private financial account for OnlyFans creators. The product starts with verified income and account security, then expands into payouts, cards, credit, savings, investing, and creator-led fan commerce.

## Built in this repository

### Private income credential

The `IncomeCredential` Cairo contract stores five public fields: a creator nullifier, a data commitment, an expiry, a version, and revocation state. The platform name, creator handle, legal identity, exact payouts, and underwriting file stay offchain.

The contract enforces verifier-only publishing, a 90-day maximum validity window, monotonic versions, expiry, revocation, and authenticated verifier rotation. The former verifier loses publishing authority as soon as rotation completes.

### Falcon-512 Starknet account

`BootyFalconAccount` is a deployable Starknet account contract. It validates compact Falcon-512 signatures through the SHAKE-256 direct verifier pinned from [OpenZeppelin cairo-pq-verifiers](https://github.com/OpenZeppelin/cairo-pq-verifiers) at commit `bece5c07eeea5784e570c01108ec000d2d04ae40`.

The account:

- stores the packed 29-felt Falcon public key;
- validates the 31-felt direct signature layout against the Starknet transaction hash;
- supports invoke, declare, deploy-account, signature-checking, and SRC5/SRC6 interface discovery;
- blocks contract callers from the execution path;
- rejects legacy transaction versions;
- accepts a valid Falcon signature and rejects tampered message data in the test suite;
- rotates its public key only when the transaction carries valid proofs from both the current and proposed Falcon keys.

The account code is experimental and unaudited. The next release gate is an independent audit plus Sepolia deployment evidence.

### Interactive creator account

The web demo includes seven primary-account areas. Home, Payments, Cards, Plan, Wealth, Creator, and Privacy stay available through one navigation system. A creator can inspect balances and activity, control cards, send sample payments, preview exchange, automate payout splits, connect income, create a private lender packet, run fan perks, and review data access. The public packet test fails if platform identity or exact earnings enter the public object.

## Privacy architecture

| Layer | Hidden from the public | Visible or disclosed | Status |
|---|---|---|---|
| Income data | Platform identity, handle, exact payouts, underwriting file | Nullifier, commitment, expiry, version | Built |
| Account authorization | Falcon secret key | Account address, public key, transaction calls | Built, local tests |
| Credit review | Full evidence packet | Review band and lender-selected disclosures | Demo |
| Regulated identity | Creator identity from merchants and the public | Bank, EMI, lender, and required compliance operators | Design |
| Money movement | Owner link and shielded balances | Pool actions and the route's remaining metadata | Next |
| App activity | Main-wallet and sibling-account link | Fresh sub-account, destination, timing, amount, and app state | Next |
| Audit access | Viewing key from public observers | Defined disclosure operator under a controlled process | Next |
| Network metadata | Direct creator-to-publish timing link | Relayer, paymaster, and batch metadata | Roadmap |

## Next build

### STRK20 payout vault

Route supported digital-dollar payouts into shielded ERC-20 state. Add private note discovery, shielded balance display, withdrawal, and a scoped viewing-key path for regulated review.

### Private sub-accounts

Create a fresh Starknet account for each high-leakage financial action. The privacy target is account-graph separation between the creator's core account, each app account, and sibling accounts. The sub-account's app calls and local position state can remain public.

### Relayer and paymaster

Remove direct fee and publishing links by submitting credential and money actions through a relayer. Add paymaster quotes so creators can pay fees in a supported account asset.

### Selective lender disclosure

Let the creator approve a lender-specific packet with the minimum income range, history, stability, and adjustment data required for underwriting. The lender still performs identity, source-of-funds, underwriting, and adverse-action duties.

### Timing and correlation defense

Batch credential publication, rotate nullifiers, separate account creation from financial actions, and measure timing, amount, route, and repeated-behavior leakage.

## Full neobank surface

The product benchmark includes the current [Ready](https://www.ready.co/) account, payment, card, reward, and community-finance features. Booty Bank adapts those tools for creators and their fans.

| Product surface | Booty Bank version | Dependency |
|---|---|---|
| Hold digital dollars | Self-custodial creator balance | Stablecoin and wallet integration |
| Global spending | Creator-safe card with low-fee settlement | Issuer, sponsor bank, processor |
| Instant virtual card | Card provisioned inside the account | Regulated card partner |
| Apple Pay and Google Pay | Mobile-wallet provisioning | Issuer and device-wallet approval |
| Send and receive | Instant digital-dollar transfers | Payment rail and compliance controls |
| Points and rewards | Creator-defined fan loyalty | Rewards ledger and redemption engine |
| Community card | Creator-branded card for fans | Card program and creator onboarding |
| Revenue share | Fan spending funds the creator | Program economics and payout contract |
| Drops and experiences | Access, merchandise, events, and private releases | Commerce and access partners |
| Income advance | Borrowing handoff based on verified payouts | Licensed lender and underwriting |
| Automatic tax vault | Rule-based payout allocation | Account and tax-provider integration |
| Invest | Regulated investment rail | Licensed investment provider |

## Post-quantum account roadmap

1. Run the Falcon account and signer end to end on local devnet.
2. Deploy the account class and a new account on Starknet Sepolia.
3. Execute a signed Booty Bank credential transaction from that account.
4. Design and implement a separate post-quantum recovery policy. Dual-proof Falcon key rotation is already built.
5. Add wallet integration without moving private key material into the browser.
6. Complete an independent account and verifier audit.
7. Publish class hashes, addresses, transactions, gas, and failure tests.
8. Move to mainnet only after audit findings close and wallet recovery works.

The account contract upgrades transaction authorization. It does not change every cryptographic surface inherited from Starknet or Ethereum. Those network surfaces follow their own post-quantum roadmaps.
