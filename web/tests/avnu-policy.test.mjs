import assert from "node:assert/strict";
import test from "node:test";

import { AVNU_MAINNET_CHAIN_ID, AVNU_MAINNET_EXCHANGE, validateAvnuSwapCalls } from "../src/lib/avnu-policy.mjs";

const sellToken = "0x4718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d";
const buyToken = "0x53c91253bc9682c04929ca02ed00b3e423f6710d2ee7e0d5ebb06f3ecf368a8";
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
