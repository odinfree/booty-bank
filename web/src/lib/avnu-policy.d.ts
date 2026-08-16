import type { AvnuCalls, Quote } from "@avnu/avnu-sdk";
import type { Call } from "starknet";

export const AVNU_MAINNET_CHAIN_ID: string;
export const AVNU_MAINNET_EXCHANGE: string;
export function validateAvnuSwapCalls(input: {
  built: AvnuCalls;
  quote: Quote;
  takerAddress: string;
  slippage: number;
  expectedChainId: string;
  expectedSellTokenAddress: string;
  expectedBuyTokenAddress: string;
  expectedSellAmount: bigint;
  expectedMinimumOutput?: bigint;
}): Call[];
