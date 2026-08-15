import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPrivateIncomePacket,
  CORE_MONEY_FEATURES,
  NEOBANK_FEATURES,
  PRIVACY_FEATURES,
} from "../src/lib/private-packet.mjs";

test("public credential excludes creator identity and earnings", () => {
  const packet = buildPrivateIncomePacket();
  const publicJson = JSON.stringify(packet.publicCredential).toLowerCase();

  assert.equal(publicJson.includes("onlyfans"), false);
  assert.equal(publicJson.includes("monthly"), false);
  assert.equal(publicJson.includes("income"), false);
  assert.equal(publicJson.includes("identity"), false);
  assert.deepEqual(Object.keys(packet.publicCredential), [
    "creatorNullifier",
    "dataCommitment",
    "validUntil",
    "version",
    "revoked",
  ]);
});

test("primary account matrix covers the core daily-money loop", () => {
  const names = new Set(CORE_MONEY_FEATURES.map((feature) => feature.name));

  assert.ok(names.has("TOTAL BALANCE + NET WORTH"));
  assert.ok(names.has("MULTI-CURRENCY ACCOUNTS"));
  assert.ok(names.has("BANK + PEER TRANSFERS"));
  assert.ok(names.has("PHYSICAL + VIRTUAL CARDS"));
  assert.ok(names.has("CARD FREEZE + GRANULAR CONTROLS"));
  assert.ok(names.has("POCKETS + BUDGETS"));
  assert.ok(names.has("SAVINGS + RECURRING INVESTING"));
  assert.ok(names.has("FRAUD ALERTS + 24/7 SUPPORT"));
  assert.ok(names.has("FALCON-512 AUTHORIZATION"));
});

test("private statement keeps exact income and platform offchain", () => {
  const packet = buildPrivateIncomePacket();

  assert.equal(packet.privateStatement.platform, "OnlyFans");
  assert.equal(packet.privateStatement.monthlyNet, 18_400);
  assert.equal(packet.account.scheme, "FALCON-512 / SHAKE-256 DIRECT");
});

test("privacy matrix distinguishes built code from roadmap work", () => {
  assert.ok(PRIVACY_FEATURES.some((feature) => feature.status === "BUILT"));
  assert.ok(PRIVACY_FEATURES.some((feature) => feature.status === "NEXT"));
  assert.ok(PRIVACY_FEATURES.some((feature) => feature.status === "ROADMAP"));
});

test("neobank matrix covers Ready card, money, payment, and community surfaces", () => {
  const names = new Set(NEOBANK_FEATURES.map((feature) => feature.name));

  assert.ok(names.has("HOLD DIGITAL DOLLARS"));
  assert.ok(names.has("GLOBAL SPEND"));
  assert.ok(names.has("INSTANT VIRTUAL CARD"));
  assert.ok(names.has("APPLE PAY + GOOGLE PAY"));
  assert.ok(names.has("SEND + RECEIVE"));
  assert.ok(names.has("POINTS + REWARDS"));
  assert.ok(names.has("CREATOR COMMUNITY CARD"));
  assert.ok(names.has("REVENUE SHARE"));
  assert.ok(names.has("DROPS + EXPERIENCES"));
});
