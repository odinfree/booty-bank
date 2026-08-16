"use client";

import type { Quote } from "@avnu/avnu-sdk";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RpcProvider, STRK20_ACTION, WalletAccountV6 } from "starknet";
import { validateAvnuSwapCalls } from "../lib/avnu-policy.mjs";
import { buildStrk20Action, formatTokenAmount, parseTokenAmount } from "../lib/strk20.mjs";
import type { AvnuSwapCommands, AvnuSwapReview, MainnetAssetSnapshot, MainnetSessionSnapshot, PublicTransferCommands, PublicTransferInput, PublicTransferReview } from "./mainnet-account-context";
import PrivyPlaceholder from "./privy-placeholder";

type NetworkName = "mainnet" | "sepolia";
type NativeSession = MainnetSessionSnapshot;
type PrivateBalance = { symbol: "STRK" | "USDC"; amount: string };
type PrivateActionKind = "deposit" | "transfer" | "withdraw";
type ShadowAccount = { address: string; balance: string; deployment: "deployed" | "undeployed" | "unknown" };
type PreparedPrivateAction = {
  account: WalletAccountV6;
  accountAddress: string;
  action: STRK20_ACTION;
  chainLiteral: NativeSession["chainLiteral"];
  generation: number;
};
type PreparedPublicTransfer = {
  account: WalletAccountV6;
  accountAddress: string;
  call: { contractAddress: string; entrypoint: string; calldata: string[] };
  generation: number;
  review: PublicTransferReview;
};
type PreparedAvnuSwap = {
  account: WalletAccountV6;
  accountAddress: string;
  generation: number;
  review: AvnuSwapReview;
  sellAmountRaw: bigint;
};

const WALLET_SESSION_KEY = "bootybank.wallet-session.v1";
const AVNU_PAYMASTER_PROXY = process.env.NEXT_PUBLIC_AVNU_PAYMASTER_URL ?? "https://bootybank.app/api/paymaster";
const AVNU_MAINNET_PAYMASTER = "https://starknet.paymaster.avnu.fi";

const SHADOW_ANONYMIZER: Record<NetworkName, string> = {
  mainnet: "0x04f33230dc57855c6e7eabe66dfa0fde82c5458fd0e54827cdb7cb4c474888a7",
  sepolia: "0x010a2285310c107c731d997afc147afb7495daff6397c2d242133d9fe8d9b147",
};

function shortAddress(address: string) {
  return address.length > 16 ? `${address.slice(0, 7)}…${address.slice(-5)}` : address;
}

function networkFromChain(chainId?: string): NetworkName | null {
  const normalized = chainId?.trim().toUpperCase() ?? "";
  if (["SN_MAIN", "STARKNET:SN_MAIN", "0X534E5F4D41494E", "STARKNET:0X534E5F4D41494E"].includes(normalized)) return "mainnet";
  if (["SN_SEPOLIA", "STARKNET:SN_SEPOLIA", "0X534E5F5345504F4C4941", "STARKNET:0X534E5F5345504F4C4941"].includes(normalized)) return "sepolia";
  return null;
}

function voyagerAddressUrl(network: NetworkName, address: string) {
  const host = network === "sepolia" ? "https://sepolia.voyager.online" : "https://voyager.online";
  return `${host}/contract/${address}`;
}

function errorLabel(error: unknown, fallback: string) {
  return error instanceof Error ? error.message.toUpperCase().slice(0, 120) : fallback;
}

function isContractNotFound(error: unknown) {
  const message = error instanceof Error ? error.message.toUpperCase() : String(error).toUpperCase();
  const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code: unknown }).code) : "";
  return code === "20" || message.includes("CONTRACT_NOT_FOUND") || message.includes("CONTRACT NOT FOUND");
}

function tokenKey(address: string) {
  try {
    return BigInt(address).toString(16);
  } catch {
    return address.toLowerCase();
  }
}

function walletId(wallet: WalletWithStarknetFeatures) {
  return wallet.features["starknet:walletApi"].id;
}

function paymasterForNetwork(network: NetworkName) {
  return { nodeUrl: network === "sepolia" ? AVNU_PAYMASTER_PROXY : AVNU_MAINNET_PAYMASTER };
}

function avnuSwapReview(quote: Quote, sellAmount: string, accountAddress: string, generation: number): AvnuSwapReview {
  const buyAmountRaw = BigInt(quote.buyAmount);
  const minimumBuyAmountRaw = buyAmountRaw * BigInt(9_950) / BigInt(10_000);
  return {
    accountAddress,
    buyAmount: formatTokenAmount(buyAmountRaw, 6, 6),
    buyAmountRaw: buyAmountRaw.toString(),
    minimumBuyAmount: formatTokenAmount(minimumBuyAmountRaw, 6, 6),
    minimumBuyAmountRaw: minimumBuyAmountRaw.toString(),
    network: "mainnet",
    priceImpact: `${(quote.priceImpact / 100).toFixed(2)}%`,
    reviewId: `${generation}:${Date.now()}:AVNU`,
    route: [...new Set(quote.routes.map((route) => route.name))].join(" + ") || "AVNU",
    sellAmount,
  };
}

async function nativeSession(account: WalletAccountV6, provider: RpcProvider, walletName: string): Promise<NativeSession> {
  const { Amount, ChainId, getPresets } = await import("starkzap");
  const feltChainId = await provider.getChainId();
  const network = networkFromChain(feltChainId);
  if (!network) throw new Error("UNSUPPORTED STARKNET NETWORK.");
  const chainId = ChainId.fromFelt252(feltChainId);
  const tokens = getPresets(chainId);
  async function readAsset(symbol: MainnetAssetSnapshot["symbol"], token: typeof tokens.STRK, decimals: number): Promise<MainnetAssetSnapshot> {
    try {
      const result = await provider.callContract({ contractAddress: token.address, entrypoint: "balance_of", calldata: [account.address] });
      const raw = BigInt(result[0] ?? 0) + (BigInt(result[1] ?? 0) << BigInt(128));
      return { address: token.address, amount: Amount.fromRaw(raw, token).toFormatted(true), decimals, raw: raw.toString(), symbol };
    } catch {
      return { address: token.address, amount: null, decimals, raw: null, symbol };
    }
  }
  const assets = await Promise.all([
    readAsset("STRK", tokens.STRK, 18),
    readAsset("USDC", tokens.USDC, 6),
  ]);
  const balance = assets.find((asset) => asset.symbol === "STRK")?.amount ?? "— STRK";
  return {
    address: account.address,
    assets,
    balance,
    chainLiteral: chainId.toLiteral(),
    network,
    refreshedAt: Date.now(),
    strkAddress: tokens.STRK.address,
    usdcAddress: tokens.USDC.address,
    walletName,
  };
}

function NativeStarknetWallet({ requiredNetwork, onSessionChange, onSwapCommandsChange, onTransferCommandsChange }: { requiredNetwork?: NetworkName; onSessionChange?: (session: NativeSession | null) => void; onSwapCommandsChange?: (commands: AvnuSwapCommands | null) => void; onTransferCommandsChange?: (commands: PublicTransferCommands | null) => void }) {
  const accountRef = useRef<WalletAccountV6 | null>(null);
  const providerRef = useRef<RpcProvider | null>(null);
  const walletRef = useRef<WalletWithStarknetFeatures | null>(null);
  const walletEventCleanupRef = useRef<null | (() => void)>(null);
  const privateOperationRef = useRef(false);
  const preparedPrivateActionRef = useRef<PreparedPrivateAction | null>(null);
  const preparedPublicTransferRef = useRef<PreparedPublicTransfer | null>(null);
  const preparedAvnuSwapRef = useRef<PreparedAvnuSwap | null>(null);
  const sessionGenerationRef = useRef(0);
  const restoreAttemptRef = useRef(false);
  const [wallets, setWallets] = useState<WalletWithStarknetFeatures[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [session, setSession] = useState<NativeSession | null>(null);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [privacyBusy, setPrivacyBusy] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState("CONNECT A STRK20 WALLET.");
  const [privateBalances, setPrivateBalances] = useState<PrivateBalance[]>([]);
  const [privateKind, setPrivateKind] = useState<PrivateActionKind>("deposit");
  const [privateAmount, setPrivateAmount] = useState("1");
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privatePreviewed, setPrivatePreviewed] = useState(false);
  const [privateTxHash, setPrivateTxHash] = useState("");
  const [shadow, setShadow] = useState<ShadowAccount | null>(null);

  const resetPrivatePreview = useCallback(() => {
    preparedPrivateActionRef.current = null;
    setPrivatePreviewed(false);
    setPrivateTxHash("");
  }, []);

  const resetPublicTransfer = useCallback(() => {
    preparedPublicTransferRef.current = null;
  }, []);

  const resetAvnuSwap = useCallback(() => {
    preparedAvnuSwapRef.current = null;
  }, []);

  const refreshPrivacy = useCallback(async (account: WalletAccountV6, provider: RpcProvider, nextSession: NativeSession, generation: number) => {
    const isCurrent = () => generation === sessionGenerationRef.current && accountRef.current === account;
    if (!isCurrent()) return;
    setPrivacyBusy(true);
    setPrivacyStatus("READING PRIVATE STATE FROM WALLET…");
    try {
      const balances = await account.strk20Balances([nextSession.strkAddress, nextSession.usdcAddress]);
      const byToken = new Map(balances.map((entry) => [tokenKey(entry.token), entry.balance]));
      const nextBalances: PrivateBalance[] = [
        { symbol: "STRK", amount: formatTokenAmount(byToken.get(tokenKey(nextSession.strkAddress)) ?? "0x0", 18) },
        { symbol: "USDC", amount: formatTokenAmount(byToken.get(tokenKey(nextSession.usdcAddress)) ?? "0x0", 6) },
      ];
      let nextShadow: ShadowAccount | null = null;
      try {
        const { hash } = await import("starknet");
        const commitment = await account.strk20ShadowAccountCommitment("BOOTY BANK", "0x0");
        const anonymizer = SHADOW_ANONYMIZER[nextSession.network];
        const classHashResult = await provider.callContract({
          contractAddress: anonymizer,
          entrypoint: "get_shadow_account_class_hash",
          calldata: [],
        });
        const classHash = classHashResult[0];
        if (!classHash) throw new Error("SHADOW CLASS HASH UNAVAILABLE.");
        const address = hash.calculateContractAddressFromHash(commitment, classHash, [], anonymizer);
        let deployment: ShadowAccount["deployment"] = "deployed";
        try {
          await provider.getClassHashAt(address);
        } catch (error) {
          deployment = isContractNotFound(error) ? "undeployed" : "unknown";
        }
        const shadowBalanceResult = await provider.callContract({
          contractAddress: nextSession.strkAddress,
          entrypoint: "balance_of",
          calldata: [address],
        });
        const rawBalance = BigInt(shadowBalanceResult[0] ?? 0) + (BigInt(shadowBalanceResult[1] ?? 0) << BigInt(128));
        nextShadow = { address, balance: formatTokenAmount(rawBalance, 18), deployment };
      } catch {
        nextShadow = null;
      }
      if (!isCurrent()) return;
      setPrivateBalances(nextBalances);
      setShadow(nextShadow);
      setPrivacyStatus("STRK20 WALLET API LIVE.");
    } catch (error) {
      if (!isCurrent()) return;
      setPrivateBalances([]);
      setShadow(null);
      setPrivacyStatus(errorLabel(error, "STRK20 API UNAVAILABLE. USE READY OR XVERSE."));
    } finally {
      if (isCurrent()) setPrivacyBusy(false);
    }
  }, []);

  const attachWallet = useCallback(async (wallet: WalletWithStarknetFeatures, silent = false, expectedAddress?: string) => {
    const generation = ++sessionGenerationRef.current;
    resetPrivatePreview();
    resetPublicTransfer();
    resetAvnuSwap();
    const { RpcProvider, WalletAccountV6 } = await import("starknet");
    const walletChain = wallet.accounts[0]?.chains[0];
    const networkCandidates = [walletChain, ...wallet.chains].map((chain) => networkFromChain(chain)).filter((value): value is NetworkName => value !== null);
    let network = requiredNetwork && networkCandidates.includes(requiredNetwork) ? requiredNetwork : networkCandidates[0];
    if (!network) throw new Error("WALLET NETWORK IS NOT MAINNET OR SEPOLIA.");
    const { networks } = await import("starkzap");
    let rpcUrl = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || networks[network].rpcUrl;
    let provider = new RpcProvider({ nodeUrl: rpcUrl });
    let account = silent
      ? await WalletAccountV6.connectSilent(provider, wallet, undefined, paymasterForNetwork(network))
      : await WalletAccountV6.connect(provider, wallet, undefined, paymasterForNetwork(network));
    const connectedWalletAccount = wallet.accounts.find((item) => tokenKey(item.address) === tokenKey(account.address));
    const connectedNetwork = networkFromChain(connectedWalletAccount?.chains[0]);
    if (!connectedNetwork) {
      account.unsubscribeChange();
      throw new Error("CONNECTED WALLET NETWORK IS NOT MAINNET OR SEPOLIA.");
    }
    if (requiredNetwork && connectedNetwork !== requiredNetwork) {
      account.unsubscribeChange();
      throw new Error(`SWITCH WALLET TO ${requiredNetwork.toUpperCase()}.`);
    }
    if (expectedAddress && tokenKey(account.address) !== tokenKey(expectedAddress)) {
      account.unsubscribeChange();
      throw new Error("SAVED WALLET ACCOUNT IS NOT ACTIVE.");
    }
    if (!process.env.NEXT_PUBLIC_STARKNET_RPC_URL && connectedNetwork !== network) {
      network = connectedNetwork;
      rpcUrl = networks[network].rpcUrl;
      provider = new RpcProvider({ nodeUrl: rpcUrl });
      const reconnectedAccount = await WalletAccountV6.connectSilent(provider, wallet, undefined, paymasterForNetwork(network));
      account.unsubscribeChange();
      account = reconnectedAccount;
    }
    if (process.env.NEXT_PUBLIC_STARKNET_RPC_URL) {
      const providerNetwork = networkFromChain(await provider.getChainId());
      if (!providerNetwork || providerNetwork !== connectedNetwork) {
        account.unsubscribeChange();
        throw new Error("RPC NETWORK DOES NOT MATCH WALLET.");
      }
    }
    const nextSession = await nativeSession(account, provider, wallet.name.toUpperCase());
    if (generation !== sessionGenerationRef.current) {
      account.unsubscribeChange();
      return;
    }
    walletEventCleanupRef.current?.();
    accountRef.current?.unsubscribeChange();
    accountRef.current = account;
    providerRef.current = provider;
    walletRef.current = wallet;
    setSession(nextSession);
    onSessionChange?.(nextSession);
    setChooserOpen(false);
    setStatus("");
    window.localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({ walletId: walletId(wallet), address: nextSession.address }));
    walletEventCleanupRef.current = account.onChange(() => {
      sessionGenerationRef.current += 1;
      resetPrivatePreview();
      resetPublicTransfer();
      resetAvnuSwap();
      setSession(null);
      onSessionChange?.(null);
      void attachWallet(wallet, true).catch(() => setStatus("ACCOUNT REFRESH FAILED."));
    });
    void refreshPrivacy(account, provider, nextSession, generation);
  }, [onSessionChange, refreshPrivacy, requiredNetwork, resetAvnuSwap, resetPrivatePreview, resetPublicTransfer]);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void (async () => {
      const { createStore } = await import("@starknet-io/get-starknet-core");
      const store = createStore();
      const update = (nextWallets: readonly WalletWithStarknetFeatures[]) => {
        if (!active) return;
        setWallets([...nextWallets]);
        if (accountRef.current || restoreAttemptRef.current) return;
        const authorized = nextWallets.filter((wallet) => wallet.accounts.length > 0);
        let saved: { walletId?: string; address?: string } | null = null;
        try {
          saved = JSON.parse(window.localStorage.getItem(WALLET_SESSION_KEY) ?? "null") as { walletId?: string; address?: string } | null;
        } catch {
          window.localStorage.removeItem(WALLET_SESSION_KEY);
        }
        const exactWallet = saved?.walletId && saved.address
          ? authorized.find((wallet) => walletId(wallet) === saved?.walletId && wallet.accounts.some((account) => tokenKey(account.address) === tokenKey(saved?.address ?? "")))
          : undefined;
        const restoreWallet = exactWallet ?? (!saved && authorized.length === 1 ? authorized[0] : undefined);
        if (!restoreWallet) return;
        restoreAttemptRef.current = true;
        void attachWallet(restoreWallet, true, exactWallet ? saved?.address : undefined)
          .catch(() => setStatus("SELECT THE WALLET AND ACCOUNT AGAIN."))
          .finally(() => { restoreAttemptRef.current = false; });
      };
      update(store.getWallets());
      unsubscribe = store.subscribe(update);
      store._refreshInjectedWallets();
    })();
    return () => {
      active = false;
      unsubscribe();
      walletEventCleanupRef.current?.();
      accountRef.current?.unsubscribeChange();
      sessionGenerationRef.current += 1;
    };
  }, [attachWallet]);

  useEffect(() => {
    if (!chooserOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setChooserOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [chooserOpen]);

  async function connectWallet(wallet: WalletWithStarknetFeatures) {
    setConnecting(true);
    setStatus("");
    try {
      await attachWallet(wallet);
    } catch (error) {
      setStatus(errorLabel(error, "WALLET CONNECTION FAILED."));
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectNative() {
    const wallet = walletRef.current;
    const account = accountRef.current;
    sessionGenerationRef.current += 1;
    resetPrivatePreview();
    resetPublicTransfer();
    resetAvnuSwap();
    walletEventCleanupRef.current?.();
    walletEventCleanupRef.current = null;
    account?.unsubscribeChange();
    try {
      if (wallet) await wallet.features["standard:disconnect"].disconnect();
    } finally {
      accountRef.current = null;
      providerRef.current = null;
      walletRef.current = null;
      setSession(null);
      onSessionChange?.(null);
      setPanelOpen(false);
      setPrivateBalances([]);
      setShadow(null);
      setPrivacyBusy(false);
      window.localStorage.removeItem(WALLET_SESSION_KEY);
    }
  }

  const previewPublicTransfer = useCallback(async (input: PublicTransferInput): Promise<PublicTransferReview> => {
    const account = accountRef.current;
    const currentSession = session;
    if (!account || !currentSession) throw new Error("CONNECT A MAINNET WALLET.");
    if (currentSession.network !== "mainnet") throw new Error("MAINNET REQUIRED.");
    const asset = currentSession.assets.find((candidate) => candidate.symbol === input.symbol);
    if (!asset || asset.raw === null) throw new Error("BALANCE UNAVAILABLE.");
    const rawAmount = BigInt(parseTokenAmount(input.amount, asset.decimals));
    if (rawAmount > BigInt(asset.raw)) throw new Error("AMOUNT EXCEEDS BALANCE.");
    const { cairo, validateAndParseAddress } = await import("starknet");
    const recipient = validateAndParseAddress(input.recipient.trim());
    if (BigInt(recipient) === BigInt(0)) throw new Error("RECIPIENT CANNOT BE ZERO.");
    const amount = cairo.uint256(rawAmount);
    const call = {
      contractAddress: asset.address,
      entrypoint: "transfer",
      calldata: [recipient, amount.low.toString(), amount.high.toString()],
    };
    const generation = sessionGenerationRef.current;
    const fee = await account.estimateInvokeFee(call);
    if (generation !== sessionGenerationRef.current || accountRef.current !== account || session?.address !== currentSession.address) {
      throw new Error("WALLET CHANGED. START AGAIN.");
    }
    const review: PublicTransferReview = {
      amount: input.amount,
      recipient,
      symbol: input.symbol,
      accountAddress: currentSession.address,
      fee: `${formatTokenAmount(BigInt(fee.overall_fee), 18, 6)} STRK`,
      network: "mainnet",
      reviewId: `${generation}:${Date.now()}:${input.symbol}`,
      tokenAddress: asset.address,
    };
    preparedPublicTransferRef.current = { account, accountAddress: currentSession.address, call, generation, review };
    return review;
  }, [session]);

  const submitPublicTransfer = useCallback(async (reviewId: string) => {
    const prepared = preparedPublicTransferRef.current;
    if (!prepared || prepared.review.reviewId !== reviewId) throw new Error("REVIEW EXPIRED. START AGAIN.");
    if (
      prepared.generation !== sessionGenerationRef.current
      || accountRef.current !== prepared.account
      || session?.network !== "mainnet"
      || tokenKey(session.address) !== tokenKey(prepared.accountAddress)
    ) {
      resetPublicTransfer();
      throw new Error("WALLET CHANGED. START AGAIN.");
    }
    resetPublicTransfer();
    const result = await prepared.account.execute(prepared.call);
    return { transactionHash: result.transaction_hash };
  }, [resetPublicTransfer, session]);

  useEffect(() => {
    onTransferCommandsChange?.({ preview: previewPublicTransfer, submit: submitPublicTransfer });
    return () => onTransferCommandsChange?.(null);
  }, [onTransferCommandsChange, previewPublicTransfer, submitPublicTransfer]);

  const quoteAvnuSwap = useCallback(async (sellAmount: string): Promise<AvnuSwapReview> => {
    const account = accountRef.current;
    const currentSession = session;
    if (!account || !currentSession) throw new Error("CONNECT A MAINNET WALLET.");
    if (currentSession.network !== "mainnet") throw new Error("MAINNET SWAP ONLY.");
    const generation = sessionGenerationRef.current;
    const [{ getQuotes }, { Amount, ChainId, getPresets }] = await Promise.all([
      import("@avnu/avnu-sdk"),
      import("starkzap"),
    ]);
    const tokens = getPresets(ChainId.MAINNET);
    const sellAmountRaw = Amount.parse(sellAmount, tokens.STRK).toBase();
    if (sellAmountRaw <= BigInt(0)) throw new Error("ENTER AN AMOUNT.");
    const strk = currentSession.assets.find((asset) => asset.symbol === "STRK");
    if (!strk?.raw) throw new Error("STRK BALANCE UNAVAILABLE.");
    if (sellAmountRaw > BigInt(strk.raw)) throw new Error("AMOUNT EXCEEDS STRK BALANCE.");
    const quotes = await getQuotes({
      sellTokenAddress: tokens.STRK.address,
      buyTokenAddress: tokens.USDC.address,
      sellAmount: sellAmountRaw,
      takerAddress: currentSession.address,
      size: 1,
    });
    const quote = quotes[0];
    if (!quote) throw new Error("NO AVNU ROUTE.");
    if (
      generation !== sessionGenerationRef.current
      || accountRef.current !== account
      || tokenKey(currentSession.address) !== tokenKey(session?.address ?? "")
    ) throw new Error("WALLET CHANGED. QUOTE AGAIN.");
    const review = avnuSwapReview(quote, sellAmount, currentSession.address, generation);
    preparedAvnuSwapRef.current = { account, accountAddress: currentSession.address, generation, review, sellAmountRaw };
    return review;
  }, [session]);

  const submitAvnuSwap = useCallback(async (reviewId: string) => {
    const prepared = preparedAvnuSwapRef.current;
    if (!prepared || prepared.review.reviewId !== reviewId) throw new Error("QUOTE EXPIRED. GET A NEW QUOTE.");
    if (
      prepared.generation !== sessionGenerationRef.current
      || accountRef.current !== prepared.account
      || session?.network !== "mainnet"
      || tokenKey(session.address) !== tokenKey(prepared.accountAddress)
    ) {
      resetAvnuSwap();
      throw new Error("WALLET CHANGED. QUOTE AGAIN.");
    }
    const [{ getQuotes, quoteToCalls }, { ChainId, getPresets }] = await Promise.all([
      import("@avnu/avnu-sdk"),
      import("starkzap"),
    ]);
    const tokens = getPresets(ChainId.MAINNET);
    const quotes = await getQuotes({
      sellTokenAddress: tokens.STRK.address,
      buyTokenAddress: tokens.USDC.address,
      sellAmount: prepared.sellAmountRaw,
      takerAddress: prepared.accountAddress,
      size: 1,
    });
    const freshQuote = quotes[0];
    if (!freshQuote) throw new Error("NO FRESH AVNU ROUTE.");
    const freshBuyAmount = BigInt(freshQuote.buyAmount);
    const consentFloor = BigInt(prepared.review.minimumBuyAmountRaw);
    const availableSlippageBps = freshBuyAmount > consentFloor
      ? Number((freshBuyAmount - consentFloor) * BigInt(10_000) / freshBuyAmount)
      : 0;
    if (availableSlippageBps < 1) {
      const review = avnuSwapReview(freshQuote, prepared.review.sellAmount, prepared.accountAddress, prepared.generation);
      preparedAvnuSwapRef.current = { ...prepared, review };
      return { status: "repriced" as const, review };
    }
    const executionSlippage = Math.min(50, availableSlippageBps) / 10_000;
    const built = await quoteToCalls({
      quoteId: freshQuote.quoteId,
      slippage: executionSlippage,
      takerAddress: prepared.accountAddress,
      executeApprove: true,
    });
    const calls = validateAvnuSwapCalls({
      built,
      quote: freshQuote,
      takerAddress: prepared.accountAddress,
      slippage: executionSlippage,
      expectedChainId: ChainId.MAINNET.toFelt252(),
      expectedSellTokenAddress: tokens.STRK.address,
      expectedBuyTokenAddress: tokens.USDC.address,
      expectedSellAmount: prepared.sellAmountRaw,
      expectedMinimumOutput: consentFloor,
    });
    if (
      prepared.generation !== sessionGenerationRef.current
      || accountRef.current !== prepared.account
      || session?.network !== "mainnet"
      || tokenKey(session.address) !== tokenKey(prepared.accountAddress)
    ) {
      resetAvnuSwap();
      throw new Error("WALLET CHANGED. QUOTE AGAIN.");
    }
    resetAvnuSwap();
    const result = await prepared.account.executePaymasterTransaction(calls, {
      feeMode: { mode: "default", gasToken: session.strkAddress },
      timeBounds: { executeBefore: Math.floor(Date.now() / 1000) + 300 },
    });
    return { status: "submitted" as const, transactionHash: result.transaction_hash };
  }, [resetAvnuSwap, session]);

  useEffect(() => {
    onSwapCommandsChange?.({ quote: quoteAvnuSwap, submit: submitAvnuSwap });
    return () => onSwapCommandsChange?.(null);
  }, [onSwapCommandsChange, quoteAvnuSwap, submitAvnuSwap]);

  function privateAction(): STRK20_ACTION {
    if (!session) throw new Error("CONNECT A WALLET.");
    return buildStrk20Action({
      kind: privateKind,
      token: session.strkAddress,
      amount: privateAmount,
      recipient: privateRecipient,
      decimals: 18,
    }) as STRK20_ACTION;
  }

  async function previewPrivateAction() {
    const account = accountRef.current;
    const currentSession = session;
    if (!account || !currentSession || privateOperationRef.current) return;
    let action: STRK20_ACTION;
    try {
      action = privateAction();
    } catch (error) {
      setPrivacyStatus(errorLabel(error, "PRIVATE ACTION IS INVALID."));
      return;
    }
    privateOperationRef.current = true;
    const generation = sessionGenerationRef.current;
    setPrivacyBusy(true);
    setPrivacyStatus("WALLET IS SIMULATING. NO PROOF OR TRANSACTION YET…");
    try {
      await account.strk20PrepareInvoke([action], true);
      if (generation !== sessionGenerationRef.current || accountRef.current !== account) throw new Error("WALLET CHANGED. PREVIEW AGAIN.");
      preparedPrivateActionRef.current = {
        account,
        accountAddress: currentSession.address,
        action,
        chainLiteral: currentSession.chainLiteral,
        generation,
      };
      setPrivatePreviewed(true);
      setPrivacyStatus("PREVIEW PASSED. WALLET APPROVAL IS NEXT.");
    } catch (error) {
      setPrivatePreviewed(false);
      setPrivacyStatus(errorLabel(error, "PRIVATE PREVIEW FAILED."));
    } finally {
      privateOperationRef.current = false;
      setPrivacyBusy(false);
    }
  }

  async function submitPrivateAction() {
    const prepared = preparedPrivateActionRef.current;
    if (!prepared || !session || !privatePreviewed || privateOperationRef.current) return;
    if (
      prepared.generation !== sessionGenerationRef.current
      || prepared.account !== accountRef.current
      || tokenKey(prepared.accountAddress) !== tokenKey(session.address)
      || prepared.chainLiteral !== session.chainLiteral
    ) {
      resetPrivatePreview();
      setPrivacyStatus("WALLET CHANGED. PREVIEW AGAIN.");
      return;
    }
    privateOperationRef.current = true;
    setPrivacyBusy(true);
    setPrivacyStatus("APPROVE IN WALLET. PROOF GENERATION CAN TAKE TIME…");
    try {
      const result = await prepared.account.strk20InvokeTransaction([prepared.action]);
      setPrivateTxHash(result.transaction_hash);
      preparedPrivateActionRef.current = null;
      setPrivatePreviewed(false);
      setPrivacyStatus("PRIVATE TRANSACTION SUBMITTED.");
      if (providerRef.current) await refreshPrivacy(prepared.account, providerRef.current, session, prepared.generation);
    } catch (error) {
      setPrivacyStatus(errorLabel(error, "PRIVATE TRANSACTION FAILED."));
    } finally {
      privateOperationRef.current = false;
      setPrivacyBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="wallet-connect-block">
        <button className="wallet-connect-button" onClick={() => setChooserOpen((value) => !value)} disabled={connecting} aria-expanded={chooserOpen}>
          {connecting ? "CONNECTING…" : "CONNECT STARKNET"}
        </button>
        {chooserOpen && (
          <section className="wallet-picker" aria-label="Choose a Starknet wallet">
            <div className="wallet-picker-head"><b>PRIVATE WALLET API</b><button onClick={() => setChooserOpen(false)} aria-label="Close wallet chooser">×</button></div>
            {wallets.length > 0 ? wallets.map((wallet) => (
              <button key={wallet.name} onClick={() => connectWallet(wallet)}>
                {/* Wallet Standard icons are packaged data URIs, not remote tracking pixels. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={wallet.icon} alt="" />
                <span>{wallet.name.toUpperCase()}</span><i>↗</i>
              </button>
            )) : <p>NO WALLET FOUND. INSTALL READY OR XVERSE FOR STRK20.</p>}
          </section>
        )}
        {status && <span className="wallet-inline-error" role="status">{status}</span>}
      </div>
    );
  }

  return (
    <div className="wallet-session">
      <button className="wallet-session-main" onClick={() => setPanelOpen(!panelOpen)} aria-expanded={panelOpen}>
        <span>{session.chainLiteral === "SN_MAIN" ? "MAINNET" : "SEPOLIA"}</span>
        <b>{shortAddress(session.address)}</b>
        <strong>{session.balance}</strong>
      </button>
      <a href={voyagerAddressUrl(session.network, session.address)} target="_blank" rel="noreferrer" aria-label="View wallet on Voyager">↗</a>
      <button onClick={disconnectNative} aria-label="Disconnect Starknet wallet">×</button>
      {panelOpen && (
        <section className="wallet-rail-panel">
          <div className="wallet-panel-head"><span>LIVE / {session.walletName}</span><b>{session.chainLiteral}</b></div>
          {status && <p className="privacy-wallet-status" role="status">{status}</p>}
          <div className="private-balance-strip">
            {privateBalances.length > 0 ? privateBalances.map((balance) => <div key={balance.symbol}><span>{balance.symbol}</span><b>{balance.amount}</b></div>) : <div><span>PRIVATE BALANCE</span><b>—</b></div>}
            <button onClick={() => accountRef.current && providerRef.current && refreshPrivacy(accountRef.current, providerRef.current, session, sessionGenerationRef.current)} disabled={privacyBusy} aria-label="Refresh private balances">↻</button>
          </div>
          <div className="private-action-tabs">
            <button className={privateKind === "deposit" ? "active" : ""} onClick={() => { setPrivateKind("deposit"); resetPrivatePreview(); }}>SHIELD</button>
            <button className={privateKind === "transfer" ? "active" : ""} onClick={() => { setPrivateKind("transfer"); resetPrivatePreview(); }}>SEND</button>
            <button className={privateKind === "withdraw" ? "active" : ""} onClick={() => { setPrivateKind("withdraw"); resetPrivatePreview(); }}>UNSHIELD</button>
          </div>
          <label><span>STRK AMOUNT</span><input value={privateAmount} onChange={(event) => { setPrivateAmount(event.target.value); resetPrivatePreview(); }} inputMode="decimal" maxLength={32} /></label>
          {privateKind !== "deposit" && <label><span>{privateKind === "transfer" ? "PRIVATE RECIPIENT" : "PUBLIC RECIPIENT"}</span><input className="address-input" value={privateRecipient} onChange={(event) => { setPrivateRecipient(event.target.value); resetPrivatePreview(); }} placeholder="0X…" spellCheck={false} /></label>}
          {!privatePreviewed ? <button className="wallet-rail-action" onClick={previewPrivateAction} disabled={privacyBusy}>PREVIEW PRIVATE ACTION ↗</button> : <button className="wallet-rail-action private-confirm" onClick={submitPrivateAction} disabled={privacyBusy}>CONFIRM IN WALLET ↗</button>}
          <p className="privacy-wallet-status" aria-live="polite">{privacyStatus}</p>
          {privateTxHash && <a className="privacy-tx-link" href={`${session.network === "sepolia" ? "https://sepolia.voyager.online" : "https://voyager.online"}/tx/${privateTxHash}`} target="_blank" rel="noreferrer">VIEW TRANSACTION ↗</a>}
          {shadow && <div className="shadow-account-card"><span>BOOTY BANK SHADOW / 00</span><b>{shortAddress(shadow.address)}</b><small>{shadow.deployment === "deployed" ? "DEPLOYED" : shadow.deployment === "undeployed" ? "FUNDABLE BEFORE DEPLOYMENT" : "DEPLOYMENT NOT VERIFIED"} / {shadow.balance} STRK</small></div>}
          <p className="privacy-edge-note">PRIVATE INSIDE THE POOL. SHIELDING, UNSHIELDING, AND TIMING REMAIN PUBLIC.</p>
        </section>
      )}
    </div>
  );
}

export default function StarknetWalletControl({ requiredNetwork, onSessionChange, onSwapCommandsChange, onTransferCommandsChange }: { requiredNetwork?: NetworkName; onSessionChange?: (session: MainnetSessionSnapshot | null) => void; onSwapCommandsChange?: (commands: AvnuSwapCommands | null) => void; onTransferCommandsChange?: (commands: PublicTransferCommands | null) => void } = {}) {
  return (
    <div className="starknet-wallet-control" aria-label="Starknet wallet controls">
      <NativeStarknetWallet requiredNetwork={requiredNetwork} onSessionChange={onSessionChange} onSwapCommandsChange={onSwapCommandsChange} onTransferCommandsChange={onTransferCommandsChange} />
      <PrivyPlaceholder />
    </div>
  );
}
