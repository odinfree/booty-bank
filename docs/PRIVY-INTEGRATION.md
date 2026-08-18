# Privy activation

Booty Bank has the complete non-signing activation path:

- Google and email authentication through `@privy-io/react-auth`
- authenticated access tokens sent to the Cloudflare Worker
- server-side token verification through `@privy-io/node`
- one idempotent, owner-bound Starknet wallet per Privy user
- D1 persistence of the Privy wallet ID, public address, and public key
- no browser endpoint for raw signing

Without a public Privy App ID, the interface intentionally renders the labelled preview.

## Dashboard steps

1. Create the Booty Bank app in the Privy dashboard.
2. Enable Google and email authentication.
3. Add `https://bootybank.app`, `https://www.bootybank.app`, `https://odinfree.github.io`, `http://localhost:3000`, and `http://127.0.0.1:3000` as allowed origins.
4. Enable passkey or authenticator MFA before wallet signing is introduced. Google or email login alone must not authorize money movement.
5. Copy the public App ID and optional Client ID into GitHub Actions repository variables:
   - `NEXT_PUBLIC_PRIVY_APP_ID`
   - `NEXT_PUBLIC_PRIVY_CLIENT_ID`
6. Add the server credentials to the existing Cloudflare Worker with `npx wrangler secret put`:
   - `PRIVY_APP_ID`
   - `PRIVY_APP_SECRET`
7. Redeploy the Worker and trigger the GitHub Pages workflow.

The Worker and web App ID must identify the same Privy app. The App Secret belongs only in the Worker secret store.

## Verification

1. Open `/app/` and choose `SOCIAL LOGIN`.
2. Sign in with Google or email.
3. Confirm that `CREATE STARKNET ACCOUNT` is an explicit user action.
4. Create the account once and confirm repeated requests return the same public Starknet address.
5. Confirm the UI says `PRIVY KEY READY. ACCOUNT NOT DEPLOYED.` No deployment or funding is implied.
6. Confirm `/api/wallet/sign` returns `404`.
7. Log out and confirm the Privy access token is not stored by Booty Bank.

## Signing gate

Privy's Tier 2 Starknet flow uses raw signing and expects a compatible Starknet account class. Booty Bank will not open that surface until the server policy binds the authenticated user, wallet, chain, account, nonce, exact calls, limits, expiry, and visible user intent. Account funding and deployment follow that review; neither happens during social login or wallet creation.
