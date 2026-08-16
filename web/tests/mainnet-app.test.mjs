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
