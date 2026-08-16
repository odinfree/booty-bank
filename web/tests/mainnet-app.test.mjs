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
  assert.match(send, /REVIEW TRANSFER/);
  assert.match(send, /CONFIRM IN WALLET/);
  assert.match(send, /A TRANSACTION HASH IS NOT FINAL SETTLEMENT/);
  assert.doesNotMatch(send, /SENT |setCompleted/);
});
