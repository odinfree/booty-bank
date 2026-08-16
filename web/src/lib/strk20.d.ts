import type { STRK20_ACTION } from "starknet10";

export function parseTokenAmount(value: string, decimals: number): string;
export function formatTokenAmount(rawValue: string | bigint, decimals: number, maximumFractionDigits?: number): string;
export function buildStrk20Action(input: {
  kind: "deposit" | "transfer" | "withdraw";
  token: string;
  amount: string;
  recipient?: string;
  decimals: number;
}): STRK20_ACTION;
