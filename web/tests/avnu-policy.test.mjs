import assert from "node:assert/strict";
import test from "node:test";

import { AVNU_MAINNET_CHAIN_ID, AVNU_MAINNET_EXCHANGE, validateAvnuSwapCalls } from "../src/lib/avnu-policy.mjs";
import { CORE_TOKEN_REGISTRY, getCoreToken, validateSwapPair } from "../src/lib/token-registry.mjs";

const sellToken = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const buyToken = "0x33068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb";
const takerAddress = "0x1234";
const quote = {
  chainId: AVNU_MAINNET_CHAIN_ID,
  sellTokenAddress: sellToken,
  sellAmount: 10n ** 19n,
  sellAmountInUsd: 2.32,
  buyTokenAddress: buyToken,
  buyAmount: 2_310_000n,
  buyAmountInUsd: 2.31,
};
const built = {
  chainId: AVNU_MAINNET_CHAIN_ID,
  calls: [
    {
      contractAddress: sellToken,
      entrypoint: "approve",
      calldata: [AVNU_MAINNET_EXCHANGE, quote.sellAmount.toString(), "0x0"],
    },
    {
      contractAddress: AVNU_MAINNET_EXCHANGE,
      entrypoint: "multi_route_swap",
      calldata: [sellToken, quote.sellAmount.toString(), "0x0", buyToken, quote.buyAmount.toString(), "0x0", "0x231ae0", "0x0", takerAddress, "0x0", "0x0", "0x0"],
    },
  ],
};
const policyInput = {
  built,
  quote,
  takerAddress,
  slippage: 0.005,
  expectedChainId: AVNU_MAINNET_CHAIN_ID,
  expectedSellTokenAddress: sellToken,
  expectedBuyTokenAddress: buyToken,
  expectedSellAmount: quote.sellAmount,
};

test("accepts the exact fresh AVNU STRK-to-USDC call shape", () => {
  assert.equal(validateAvnuSwapCalls(policyInput).length, 2);
});

test("rejects altered AVNU approval, recipient, minimum output, and router calls", () => {
  const mutations = [
    (copy) => { copy.calls[0].calldata[0] = "0x999"; },
    (copy) => { copy.calls[1].calldata[8] = "0x999"; },
    (copy) => { copy.calls[1].calldata[6] = "0x1"; },
    (copy) => { copy.calls[1].contractAddress = "0x999"; },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(built);
    mutate(copy);
    assert.throws(() => validateAvnuSwapCalls({ ...policyInput, built: copy }), /REJECTED/);
  }
});

test("rejects stale-chain and implausible value quotes", () => {
  assert.throws(() => validateAvnuSwapCalls({ ...policyInput, built: { ...built, chainId: "0x1" } }), /MAINNET/);
  assert.throws(() => validateAvnuSwapCalls({ ...policyInput, quote: { ...quote, buyAmountInUsd: 5 } }), /VALUE DEVIATION/);
});

test("rejects a quote substituted away from the user's exact intent", () => {
  const mutations = [
    { expectedSellTokenAddress: "0x999" },
    { expectedBuyTokenAddress: "0x999" },
    { expectedSellAmount: quote.sellAmount + 1n },
  ];
  for (const mutation of mutations) {
    assert.throws(() => validateAvnuSwapCalls({ ...policyInput, ...mutation }), /INTENT/);
  }
});

test("rejects calldata below the output floor the user reviewed", () => {
  assert.throws(() => validateAvnuSwapCalls({
    ...policyInput,
    expectedMinimumOutput: BigInt("0x231ae1"),
  }), /MINIMUM OUTPUT/);
});

test("the swap registry is a pinned allowlist with unique symbols and addresses", () => {
  assert.deepEqual(CORE_TOKEN_REGISTRY.map((token) => token.symbol), ["STRK", "USDC", "ETH", "WBTC"]);
  assert.equal(new Set(CORE_TOKEN_REGISTRY.map((token) => token.symbol)).size, CORE_TOKEN_REGISTRY.length);
  assert.equal(new Set(CORE_TOKEN_REGISTRY.map((token) => BigInt(token.address).toString(16))).size, CORE_TOKEN_REGISTRY.length);
  assert.equal(getCoreToken("WBTC").decimals, 8);
});

test("the registry enables buying and selling while rejecting same-token pairs", () => {
  assert.deepEqual(validateSwapPair("STRK", "USDC").map((token) => token.symbol), ["STRK", "USDC"]);
  assert.deepEqual(validateSwapPair("USDC", "STRK").map((token) => token.symbol), ["USDC", "STRK"]);
  assert.throws(() => validateSwapPair("ETH", "ETH"), /DIFFERENT TOKENS/);
  assert.throws(() => validateSwapPair("DOG", "USDC"), /SUPPORTED TOKEN/);
});
