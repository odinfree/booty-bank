export type CoreTokenSymbol = "STRK" | "USDC" | "ETH" | "WBTC";

export type CoreToken = {
  readonly symbol: CoreTokenSymbol;
  readonly presetKey: CoreTokenSymbol;
  readonly address: string;
  readonly decimals: number;
};

export const CORE_TOKEN_REGISTRY: readonly CoreToken[];
export function getCoreToken(symbol: string): CoreToken;
export function validateSwapPair(sellSymbol: string, buySymbol: string): [CoreToken, CoreToken];
export function assertStarkzapPreset<T extends { address: string; decimals: number }>(token: CoreToken, preset: T): T;
