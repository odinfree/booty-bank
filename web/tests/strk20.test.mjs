import test from "node:test";
import assert from "node:assert/strict";
import { buildStrk20Action, formatTokenAmount, parseTokenAmount, tokenBalancePercentage } from "../src/lib/strk20.mjs";

test("parseTokenAmount converts decimal units without floating point", () => {
  assert.equal(parseTokenAmount("1.25", 6), "0x1312d0");
  assert.equal(parseTokenAmount("0.000001", 6), "0x1");
});

test("parseTokenAmount rejects zero, negative, and excessive precision", () => {
  assert.throws(() => parseTokenAmount("0", 18), /ABOVE ZERO/);
  assert.throws(() => parseTokenAmount("-1", 18), /POSITIVE NUMBER/);
  assert.throws(() => parseTokenAmount("1.0000001", 6), /MAX 6 DECIMALS/);
});

test("buildStrk20Action validates recipients and preserves action type", () => {
  assert.deepEqual(buildStrk20Action({ kind: "deposit", token: "0x1", amount: "2", decimals: 6 }), {
    type: "deposit", token: "0x1", amount: "0x1e8480",
  });
  assert.throws(() => buildStrk20Action({ kind: "transfer", token: "0x1", amount: "2", recipient: "alice", decimals: 6 }), /STARKNET ADDRESS/);
  assert.throws(() => buildStrk20Action({ kind: "transfer", token: "0x1", amount: "2", recipient: "0x0", decimals: 6 }), /STARKNET ADDRESS/);
  assert.throws(() => buildStrk20Action({ kind: "transfer", token: "0x1", amount: "2", recipient: "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff", decimals: 6 }), /STARKNET ADDRESS/);
  assert.equal(buildStrk20Action({ kind: "withdraw", token: "0x1", amount: "2", recipient: "0xabc", decimals: 6 }).type, "withdraw");
  assert.equal(buildStrk20Action({ kind: "withdraw", token: "0x1", amount: "2", recipient: "0XABC", decimals: 6 }).recipient, "0xABC");
});

test("formatTokenAmount keeps private balances readable", () => {
  assert.equal(formatTokenAmount("0x1312d0", 6), "1.25");
  assert.equal(formatTokenAmount(12_345_678_900_000_000_000n, 18, 3), "12.345");
});

test("tokenBalancePercentage fills exact token-safe shortcuts", () => {
  assert.equal(tokenBalancePercentage("53926078", 4, 25), "1348.1519");
  assert.equal(tokenBalancePercentage("53926078", 4, 50), "2696.3039");
  assert.equal(tokenBalancePercentage("53926078", 4, 75), "4044.4558");
  assert.equal(tokenBalancePercentage("53926078", 4, 100), "5392.6078");
  assert.equal(tokenBalancePercentage("1000000000000000001", 18, 100), "1.000000000000000001");
  assert.throws(() => tokenBalancePercentage("1", 18, 25), /TOO LOW/);
  assert.throws(() => tokenBalancePercentage("100", 18, 0), /FROM 1 TO 100/);
});
