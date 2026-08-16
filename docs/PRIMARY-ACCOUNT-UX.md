# Booty Bank primary account UX

Booty Bank should replace a creator's daily money app, not sit beside it as a credit widget. The product therefore starts with the primary-account loop and brings creator income, privacy, and fan commerce into the same navigation.

## Navigation

The desktop app uses a persistent left rail. The phone app uses a persistent bottom bar inside a full-height product viewport. Both expose the same seven areas and preserve the active state.

| Area | First question answered | Primary action |
|---|---|---|
| Home | How much can I use now? | Add, send, exchange, or borrow |
| Payments | Where did money move? | Send, request, schedule, or create a link |
| Cards | Which card is exposed? | Freeze or change a control |
| Plan | Where will the next payout go? | Edit a payout rule or pocket |
| Wealth | What do I own across cash and investments? | Save or invest on a schedule |
| Creator | What did I earn and what can I offer fans? | Connect income, request an advance, or publish a perk |
| Privacy | Who saw which part of my financial data? | Review access or change disclosure |

## Primary-account loop

1. The home screen opens on spendable balance, current movement, and the next payout.
2. Four actions stay one tap away. Add money, send, exchange, and borrow.
3. Each action opens a focused sheet without discarding the current screen.
4. The sheet shows recipient or route, amount, currency, arrival, fee, and the final verb before confirmation.
5. The app returns immediate status feedback and preserves the completed context in activity.

## Creator income loop

The creator view separates payout sources from public credentials. Platform identity and exact earnings remain in the private statement. The public object contains a nullifier, commitment, expiry, version, and revocation state. A lender packet exposes only the fields authorized for that review.

An incoming payout can automatically split into tax, operating, future, and spendable pockets. The user sees the split before the payout lands and can disable the automation from Home or Plan.

## Card control loop

Every card has a visible state, last four digits, and one control surface. Freeze, online payments, cash withdrawals, and monthly limits live together. A disposable virtual card identifies its number-rotation behavior before use. The fan card routes to Creator because its rewards and access rules belong to the creator program.

## Privacy loop

Private mode redacts balances and transaction amounts across every screen. The privacy area separates three layers.

- Falcon-512 authorizes the Starknet account.
- The income credential limits public financial data.
- STRK20 shield, private transfer, and unshield are live through capable wallets. Private sub-accounts remain planned work.

The access log names the reader, fields, time, and access status. Disclosure should be visible and reversible wherever the underlying partner permits revocation.

## Failure and recovery

The app keeps destructive controls explicit. Card freeze is reversible. Payment and exchange sheets show the final amount before confirmation. A failed partner call must keep the source balance unchanged and return a human-readable reason.

The Falcon account now requires current-key authorization and proposed-key proof of possession for rotation. A separate post-quantum recovery policy still needs a design that does not fall back to ECDSA. Until that ships and receives an independent audit, the account stays off mainnet.

## Feature boundary

The interface demonstrates the complete daily-money surface. Licensed operators must supply custody, fiat accounts, card issuance, ATM access, investment execution, lending, fraud operations, and human support. The public build matrix labels these dependencies instead of presenting them as live services.
