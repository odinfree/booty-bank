# Hackathon Mainnet evidence

The production app runs at `https://bootybank.app/`. A successful AVNU swap proves that the product can execute a real Starknet Mainnet transaction. It is useful demo evidence, but it does not satisfy the hackathon's separate requirement for three STRK20 Mainnet transactions unless the receipt contains an event from the live STRK20 pool.

## Required STRK20 evidence

Use a privacy-capable wallet and complete three successful Mainnet pool actions from Booty Bank's STRK20 controls. Shield, private transfer, and unshield are implemented through the Starknet Wallet API. The wallet keeps viewing keys, notes, proving, and submission.

For each action:

1. Connect Ready or another wallet exposing Starknet Wallet API `0.10.3` or newer on Mainnet.
2. Open `/app/privacy/` and choose `SHIELD`, `SEND`, or `UNSHIELD`.
3. Preview the action, approve the wallet requests, and wait for the submitted hash.
4. Open the hash on Starkscan and verify that the transaction succeeded.
5. Confirm that the transaction receipt contains a live STRK20 pool event.
6. Save the hash. Do not record rejected, reverted, pending, AVNU-only, or non-pool transactions.

After three qualifying transactions, update the root file to:

```json
{
  "demo_url": "https://bootybank.app/",
  "transactions": [
    "0xFIRST_SUCCESSFUL_POOL_TRANSACTION",
    "0xSECOND_SUCCESSFUL_POOL_TRANSACTION",
    "0xTHIRD_SUCCESSFUL_POOL_TRANSACTION"
  ]
}
```

The published hackathon checker reads the repository periodically. Keep the hashes in the root `strk20.json`; do not substitute a public AVNU swap merely because it is a successful Mainnet transaction.
