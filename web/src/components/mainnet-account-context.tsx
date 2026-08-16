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

export type PublicTransferInput = {
  amount: string;
  recipient: string;
  symbol: "STRK" | "USDC";
};

export type PublicTransferReview = PublicTransferInput & {
  accountAddress: string;
  fee: string;
  network: "mainnet";
  reviewId: string;
  tokenAddress: string;
};

export type PublicTransferCommands = {
  preview(input: PublicTransferInput): Promise<PublicTransferReview>;
  submit(reviewId: string): Promise<{ transactionHash: string }>;
};

export type AvnuSwapReview = {
  accountAddress: string;
  buyAmount: string;
  buyAmountRaw: string;
  minimumBuyAmount: string;
  minimumBuyAmountRaw: string;
  network: "mainnet";
  priceImpact: string;
  reviewId: string;
  route: string;
  sellAmount: string;
};

export type AvnuSwapSubmitResult =
  | { status: "repriced"; review: AvnuSwapReview }
  | { status: "submitted"; transactionHash: string };

export type AvnuSwapCommands = {
  quote(sellAmount: string): Promise<AvnuSwapReview>;
  submit(reviewId: string): Promise<AvnuSwapSubmitResult>;
};

export const MainnetAccountContext = createContext<{
  swapCommands: AvnuSwapCommands | null;
  session: MainnetSessionSnapshot | null;
  transferCommands: PublicTransferCommands | null;
}>({ session: null, swapCommands: null, transferCommands: null });

export function useMainnetAccount() {
  return useContext(MainnetAccountContext);
}
