"use client";

import { createContext, useContext } from "react";

export type MainnetAssetSnapshot = {
  address: string;
  amount: string | null;
  decimals: number;
  raw: string | null;
  symbol: "STRK" | "USDC";
};

export type MainnetSessionSnapshot = {
  address: string;
  assets: MainnetAssetSnapshot[];
  balance: string;
  chainLiteral: "SN_MAIN" | "SN_SEPOLIA";
  network: "mainnet" | "sepolia";
  refreshedAt: number;
  strkAddress: string;
  usdcAddress: string;
  walletName: string;
};

export const MainnetAccountContext = createContext<{ session: MainnetSessionSnapshot | null }>({ session: null });

export function useMainnetAccount() {
  return useContext(MainnetAccountContext);
}
