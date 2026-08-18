import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = async (path) => readFile(new URL(path, import.meta.url), "utf8");

test("the app opens as a routed Mainnet product instead of fabricated banking data", async () => {
  const [page, layout, shell] = await Promise.all([
    source("../src/app/app/page.tsx"),
    source("../src/app/app/layout.tsx"),
    source("../src/components/mainnet-app-shell.tsx"),
  ]);

  assert.doesNotMatch(page, /BankApp|SAMPLE BANKING|\$28,491|ONLYFANS PAYOUT|NEXT PAYOUT/);
  assert.match(page, /NO SAMPLE BALANCE/);
  assert.match(page, /CONNECT YOUR STARKNET WALLET/);
  assert.match(layout, /MainnetAppShell/);
  for (const route of ["/app/", "/app/assets/", "/app/send/", "/app/privacy/"]) {
    assert.ok(shell.includes(route), `Missing Mainnet app route: ${route}`);
  }
});

test("partner products have explicit non-live states", async () => {
  const files = await Promise.all([
    source("../src/app/app/cards/page.tsx"),
    source("../src/app/app/payouts/page.tsx"),
    source("../src/app/app/credit/page.tsx"),
  ]);
  const copy = files.join("\n");
  assert.match(copy, /PARTNER REQUIRED/);
  assert.match(copy, /DEMO TOOL/);
  assert.doesNotMatch(copy, /setCompleted|SAMPLE PAYMENT|CARD FLOW OPEN/);
});

test("the Mainnet shell publishes only wallet-derived asset state", async () => {
  const [wallet, context, overview, assets, receive] = await Promise.all([
    source("../src/components/starknet-wallet-control.tsx"),
    source("../src/components/mainnet-account-context.tsx"),
    source("../src/app/app/page.tsx"),
    source("../src/app/app/assets/page.tsx"),
    source("../src/app/app/receive/page.tsx"),
  ]);

  assert.match(wallet, /requiredNetwork/);
  assert.match(wallet, /SWITCH WALLET TO/);
  assert.match(wallet, /readAsset\("STRK"/);
  assert.match(wallet, /readAsset\("USDC"/);
  assert.match(context, /MainnetSessionSnapshot/);
  assert.match(overview, /session\.assets\.map/);
  assert.match(assets, /session\.assets\.map/);
  assert.match(receive, /navigator\.clipboard\.writeText\(session\.address\)/);
  assert.doesNotMatch(`${overview}\n${assets}\n${receive}`, /\$\d/);
});

test("public send binds a reviewed transfer to the exact wallet session", async () => {
  const [wallet, send] = await Promise.all([
    source("../src/components/starknet-wallet-control.tsx"),
    source("../src/app/app/send/page.tsx"),
  ]);

  assert.match(wallet, /validateAndParseAddress/);
  assert.match(wallet, /AMOUNT EXCEEDS BALANCE/);
  assert.match(wallet, /estimateInvokeFee/);
  assert.match(wallet, /prepared\.generation !== sessionGenerationRef\.current/);
  assert.match(wallet, /prepared\.account\.execute\(prepared\.call\)/);
  assert.match(wallet, /TRANSFER SUBMITTED FROM THE PREVIOUS WALLET/);
  assert.match(send, /REVIEW TRANSFER/);
  assert.match(send, /CONFIRM IN WALLET/);
  assert.match(send, /A TRANSACTION HASH IS NOT FINAL SETTLEMENT/);
  assert.doesNotMatch(send, /SENT |setCompleted/);
});

test("AVNU swap binds execution to the output floor the user reviewed", async () => {
  const [wallet, context, policy, swap] = await Promise.all([
    source("../src/components/starknet-wallet-control.tsx"),
    source("../src/components/mainnet-account-context.tsx"),
    source("../src/lib/avnu-policy.mjs"),
    source("../src/app/app/swap/page.tsx"),
  ]);

  assert.match(context, /AvnuSwapReview/);
  assert.match(wallet, /expectedMinimumOutput: consentFloor/);
  assert.match(wallet, /status: "repriced"/);
  assert.match(wallet, /STRK REQUIRED FOR GAS/);
  assert.match(wallet, /SWAP SUBMITTED FROM THE PREVIOUS WALLET/);
  assert.match(policy, /expectedMinimumOutput/);
  assert.match(swap, /MINIMUM RECEIVED/);
  assert.match(swap, /sellSymbol/);
  assert.match(swap, /buySymbol/);
  assert.match(swap, /FLIP PAIR/);
  assert.match(wallet, /validateSwapPair/);
  assert.match(swap, /NO WALLET REQUEST IS SENT/);
  assert.doesNotMatch(swap, /CONSENT FIX NEXT/);
});

test("the wallet picker always leads with actual Starknet wallet choices", async () => {
  const wallet = await source("../src/components/starknet-wallet-control.tsx");

  assert.match(wallet, /STARKNET WALLETS/);
  assert.match(wallet, /readyWallet/);
  assert.match(wallet, /braavos/);
  assert.match(wallet, /XVERSE_WALLET/);
  assert.match(wallet, /https:\/\/www\.xverse\.app\/download/);
  assert.match(wallet, /RECOMMENDED/);
  assert.match(wallet, /OTHER STARKNET CONNECTORS/);
  assert.match(wallet, /discoveryRefreshRef/);
});

test("Mainnet account and transaction links open on Starkscan", async () => {
  const [explorer, wallet, receive, send, swap] = await Promise.all([
    source("../src/lib/starknet-explorer.mjs"),
    source("../src/components/starknet-wallet-control.tsx"),
    source("../src/app/app/receive/page.tsx"),
    source("../src/app/app/send/page.tsx"),
    source("../src/app/app/swap/page.tsx"),
  ]);

  assert.match(explorer, /https:\/\/starkscan\.co/);
  assert.match(explorer, /https:\/\/sepolia\.voyager\.online/);
  assert.match(wallet, /explorerAddressUrl/);
  assert.match(wallet, /explorerTransactionUrl/);
  for (const page of [receive, send, swap]) {
    assert.match(page, /starkscan\.co/);
    assert.doesNotMatch(page, /voyager\.online/);
  }
});

test("STRK20 controls shield, transfer, and unshield selectable tokens through a capable wallet", async () => {
  const wallet = await source("../src/components/starknet-wallet-control.tsx");

  assert.match(wallet, /walletV6\.supportedWalletApi/);
  assert.match(wallet, /compareVersions/);
  assert.match(wallet, /privateSymbol/);
  assert.match(wallet, /CORE_TOKEN_REGISTRY\.map/);
  assert.match(wallet, /clearPrivateSessionState/);
  assert.match(wallet, /strk20InvokeTransaction/);
  assert.match(wallet, /tokenBalancePercentage/);
  assert.match(wallet, /PUBLIC AVAILABLE/);
  assert.match(wallet, /PRIVATE AVAILABLE/);
  assert.match(wallet, /\[25, 50, 75, 100\]/);
  assert.match(wallet, /SAVE THIS HASH FOR STRK20\.JSON/);
  assert.doesNotMatch(wallet, /void refreshPrivacy\(account, provider, nextSession, generation\)/);
});

test("the app shell marks live wallet routes apart from sample surfaces", async () => {
  const shell = await source("../src/components/mainnet-app-shell.tsx");

  assert.match(shell, /LIVE \/ WALLET DATA/);
  assert.match(shell, /SAMPLE \/ DEMO DATA/);
  assert.match(shell, /SELF-CUSTODIAL DEMO\./);
  assert.match(shell, /NOT A BANK\./);
  assert.match(shell, /bb-app-brief/);
  assert.match(shell, /GOT IT/);
});

test("private actions run in one wallet step with honest waiting and failure states", async () => {
  const [wallet, launch] = await Promise.all([
    source("../src/components/starknet-wallet-control.tsx"),
    source("../src/app/app/privacy/page.tsx"),
  ]);

  // The wallet owns proving and approval: no app-side prepare leg, no silent hang.
  assert.doesNotMatch(wallet, /strk20PrepareInvoke/);
  assert.doesNotMatch(wallet, /WALLET IS SIMULATING/);
  assert.doesNotMatch(wallet, /TWO WALLET STEPS/);
  assert.match(wallet, /A SHIELD SETTLES AS TWO ONCHAIN TRANSACTIONS: TOKEN APPROVAL, THEN THE POOL DEPOSIT\./);
  assert.match(wallet, /IT ASKS TWICE FOR ONE ORDER: THE PROOF, THEN THE TRANSACTION\. ONLY ONE TRANSACTION SETTLES ONCHAIN\./);
  // Balance reads are consent-gated wallet calls: never auto-fire one after an order.
  assert.doesNotMatch(wallet, /await refreshPrivacy/);
  assert.match(wallet, /LOAD PRIVATE BALANCES WITH ↻ ONCE THE NOTE MATURES\./);
  assert.match(wallet, /STILL WAITING\? OPEN THE READY PANEL FROM THE EXTENSION BAR\./);
  assert.match(wallet, /WALLET DECLINED\. NOTHING WAS SUBMITTED\./);
  assert.match(wallet, /NOTHING WAS SUBMITTED\./);
  assert.match(wallet, /SHIELD IN WALLET/);
  assert.match(wallet, /clearTimeout\(waitHint\)/);
  assert.doesNotMatch(launch, /TWO WALLET STEPS/);
});

test("unshield is one button back to the connected wallet", async () => {
  const wallet = await source("../src/components/starknet-wallet-control.tsx");

  assert.match(wallet, /privateKind === "withdraw" \? session\.address : privateRecipient/);
  assert.match(wallet, /UNSHIELDS TO YOUR CONNECTED WALLET/);
  assert.match(wallet, /privateKind === "transfer" && <label><span>PRIVATE RECIPIENT<\/span>/);
  assert.doesNotMatch(wallet, /PUBLIC RECIPIENT/);
});
