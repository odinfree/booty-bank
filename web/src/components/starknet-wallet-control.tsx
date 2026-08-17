"use client";

import type { Quote } from "@avnu/avnu-sdk";
import { braavos, readyWallet } from "@starknet-io/get-starknet-core/wallets";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RpcProvider, STRK20_ACTION, WalletAccountV6 } from "starknet";
import { validateAvnuSwapCalls } from "../lib/avnu-policy.mjs";
import { explorerAddressUrl, explorerName, explorerTransactionUrl } from "../lib/starknet-explorer.mjs";
import { buildStrk20Action, formatTokenAmount, parseTokenAmount } from "../lib/strk20.mjs";
import { assertStarkzapPreset, CORE_TOKEN_REGISTRY, validateSwapPair } from "../lib/token-registry.mjs";
import type { CoreToken, CoreTokenSymbol } from "../lib/token-registry.mjs";
import type { AvnuSwapCommands, AvnuSwapInput, AvnuSwapReview, MainnetAssetSnapshot, MainnetSessionSnapshot, PublicTransferCommands, PublicTransferInput, PublicTransferReview } from "./mainnet-account-context";
import PrivyPlaceholder from "./privy-placeholder";

type NetworkName = "mainnet" | "sepolia";
type NativeSession = MainnetSessionSnapshot;
type PrivateBalance = { symbol: CoreTokenSymbol; amount: string };
type PrivateActionKind = "deposit" | "transfer" | "withdraw";
type ShadowAccount = { address: string; balance: string; deployment: "deployed" | "undeployed" | "unknown" };
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
const XVERSE_WALLET = {
  id: "xverse",
  name: "Xverse",
  icon: "/xverse-wallet.svg",
  downloads: { chrome: "https://www.xverse.app/download" },
} as const;
const RECOMMENDED_STARKNET_WALLETS = [readyWallet, braavos, XVERSE_WALLET] as const;

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

function walletMatches(wallet: WalletWithStarknetFeatures, information: { id: string; name: string }) {
  return walletId(wallet).toLowerCase() === information.id.toLowerCase()
    || wallet.name.toLowerCase() === information.name.toLowerCase();
}

function walletDownloadUrl(downloads: Record<string, string>) {
  return downloads.chrome ?? Object.values(downloads)[0] ?? "https://www.starknet.io/wallets/";
}

function paymasterForNetwork(network: NetworkName) {
  return { nodeUrl: network === "sepolia" ? AVNU_PAYMASTER_PROXY : AVNU_MAINNET_PAYMASTER };
}

function avnuSwapReview(quote: Quote, input: AvnuSwapInput, sellToken: CoreToken, buyToken: CoreToken, accountAddress: string, generation: number): AvnuSwapReview {
  const buyAmountRaw = BigInt(quote.buyAmount);
  const minimumBuyAmountRaw = buyAmountRaw * BigInt(9_950) / BigInt(10_000);
  return {
    accountAddress,
    buyAmount: formatTokenAmount(buyAmountRaw, buyToken.decimals, 6),
    buyAmountRaw: buyAmountRaw.toString(),
    buyDecimals: buyToken.decimals,
    buySymbol: buyToken.symbol,
    buyTokenAddress: buyToken.address,
    minimumBuyAmount: formatTokenAmount(minimumBuyAmountRaw, buyToken.decimals, 6),
    minimumBuyAmountRaw: minimumBuyAmountRaw.toString(),
    network: "mainnet",
    priceImpact: `${(quote.priceImpact / 100).toFixed(2)}%`,
    reviewId: `${generation}:${Date.now()}:${sellToken.symbol}:${buyToken.symbol}:AVNU`,
    route: [...new Set(quote.routes.map((route) => route.name))].join(" + ") || "AVNU",
    sellAmount: input.sellAmount,
    sellDecimals: sellToken.decimals,
    sellSymbol: sellToken.symbol,
    sellTokenAddress: sellToken.address,
  };
}

async function nativeSession(account: WalletAccountV6, provider: RpcProvider, walletName: string): Promise<NativeSession> {
  const { Amount, ChainId, getPresets } = await import("starkzap");
  const feltChainId = await provider.getChainId();
  const network = networkFromChain(feltChainId);
  if (!network) throw new Error("UNSUPPORTED STARKNET NETWORK.");
  const chainId = ChainId.fromFelt252(feltChainId);
  const tokens = getPresets(chainId);
  if (network === "mainnet") {
    for (const token of CORE_TOKEN_REGISTRY) assertStarkzapPreset(token, tokens[token.presetKey]);
  }
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
    readAsset("ETH", tokens.ETH, 18),
    readAsset("WBTC", tokens.WBTC, 8),
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
  const discoveryRefreshRef = useRef<null | (() => void)>(null);
  const privateOperationRef = useRef(false);
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
  const [privacySupported, setPrivacySupported] = useState(false);
  const [privacyStatus, setPrivacyStatus] = useState("CONNECT A STRK20 WALLET.");
  const [privateBalances, setPrivateBalances] = useState<PrivateBalance[]>([]);
  const [privateKind, setPrivateKind] = useState<PrivateActionKind>("deposit");
  const [privateSymbol, setPrivateSymbol] = useState<PrivateBalance["symbol"]>("STRK");
  const [privateAmount, setPrivateAmount] = useState("1");
  const [privateRecipient, setPrivateRecipient] = useState("");
  const [privateTxHash, setPrivateTxHash] = useState("");
  const [shadow, setShadow] = useState<ShadowAccount | null>(null);

  const resetPrivatePreview = useCallback(() => {
    setPrivateTxHash("");
  }, []);

  const resetPublicTransfer = useCallback(() => {
    preparedPublicTransferRef.current = null;
  }, []);

  const resetAvnuSwap = useCallback(() => {
    preparedAvnuSwapRef.current = null;
  }, []);

  const clearPrivateSessionState = useCallback(() => {
    privateOperationRef.current = false;
    setPrivateBalances([]);
    setShadow(null);
    setPrivacyBusy(false);
    setPrivateTxHash("");
    setPrivacySupported(false);
    setPrivacyStatus("CONNECT A STRK20 WALLET.");
  }, []);

  const refreshPrivacy = useCallback(async (account: WalletAccountV6, provider: RpcProvider, nextSession: NativeSession, generation: number) => {
    const isCurrent = () => generation === sessionGenerationRef.current && accountRef.current === account;
    if (!isCurrent()) return;
    setPrivacyBusy(true);
    setPrivacyStatus("READING PRIVATE STATE FROM WALLET…");
    try {
      const balances = await account.strk20Balances(nextSession.assets.map((asset) => asset.address));
      const byToken = new Map(balances.map((entry) => [tokenKey(entry.token), entry.balance]));
      const nextBalances: PrivateBalance[] = nextSession.assets.map((asset) => ({
        symbol: asset.symbol,
        amount: formatTokenAmount(byToken.get(tokenKey(asset.address)) ?? "0x0", asset.decimals),
      }));
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
    clearPrivateSessionState();
    resetPublicTransfer();
    resetAvnuSwap();
    const { compareVersions, RpcProvider, walletV6, WalletAccountV6 } = await import("starknet");
    const walletApiVersions = await walletV6.supportedWalletApi(wallet).catch(() => []);
    const supportsStrk20 = walletApiVersions.some((version) => compareVersions(String(version), "0.10.3") >= 0);
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
    setPrivacySupported(supportsStrk20);
    setPrivacyStatus(supportsStrk20 ? "STRK20 READY. LOAD PRIVATE BALANCES WHEN YOU CHOOSE." : "THIS WALLET DOES NOT EXPOSE STRK20 WALLET API 0.10.3.");
    onSessionChange?.(nextSession);
    setChooserOpen(false);
    setStatus("");
    window.localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({ walletId: walletId(wallet), address: nextSession.address }));
    walletEventCleanupRef.current = account.onChange(() => {
      sessionGenerationRef.current += 1;
      clearPrivateSessionState();
      resetPublicTransfer();
      resetAvnuSwap();
      setSession(null);
      setPrivacySupported(false);
      onSessionChange?.(null);
      void attachWallet(wallet, true).catch(() => setStatus("ACCOUNT REFRESH FAILED."));
    });
  }, [clearPrivateSessionState, onSessionChange, refreshPrivacy, requiredNetwork, resetAvnuSwap, resetPublicTransfer]);

  useEffect(() => {
    let active = true;
    let unsubscribe: () => void = () => undefined;
    void (async () => {
      const { createStore } = await import("@starknet-io/get-starknet-core");
      const store = createStore();
      discoveryRefreshRef.current = store._refreshInjectedWallets;
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
      discoveryRefreshRef.current = null;
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

  useEffect(() => {
    const openStrk20 = () => {
      if (accountRef.current) setPanelOpen(true);
      else {
        discoveryRefreshRef.current?.();
        setChooserOpen(true);
      }
    };
    window.addEventListener("bootybank:open-strk20", openStrk20);
    return () => window.removeEventListener("bootybank:open-strk20", openStrk20);
  }, []);

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

  function openWalletChooser() {
    if (!chooserOpen) discoveryRefreshRef.current?.();
    setChooserOpen(!chooserOpen);
  }

  async function disconnectNative() {
    const wallet = walletRef.current;
    const account = accountRef.current;
    sessionGenerationRef.current += 1;
    clearPrivateSessionState();
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
    if (
      prepared.generation !== sessionGenerationRef.current
      || accountRef.current !== prepared.account
      || tokenKey(session.address) !== tokenKey(prepared.accountAddress)
    ) throw new Error("TRANSFER SUBMITTED FROM THE PREVIOUS WALLET. CHECK THAT WALLET ON STARKSCAN.");
    return { transactionHash: result.transaction_hash };
  }, [resetPublicTransfer, session]);

  useEffect(() => {
    onTransferCommandsChange?.({ preview: previewPublicTransfer, submit: submitPublicTransfer });
    return () => onTransferCommandsChange?.(null);
  }, [onTransferCommandsChange, previewPublicTransfer, submitPublicTransfer]);

  const quoteAvnuSwap = useCallback(async (input: AvnuSwapInput): Promise<AvnuSwapReview> => {
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
    const [sellToken, buyToken] = validateSwapPair(input.sellSymbol, input.buySymbol);
    const sellPreset = assertStarkzapPreset(sellToken, tokens[sellToken.presetKey]);
    assertStarkzapPreset(buyToken, tokens[buyToken.presetKey]);
    const sellAmountRaw = Amount.parse(input.sellAmount, sellPreset).toBase();
    if (sellAmountRaw <= BigInt(0)) throw new Error("ENTER AN AMOUNT.");
    const sellAsset = currentSession.assets.find((asset) => asset.symbol === sellToken.symbol);
    if (!sellAsset?.raw) throw new Error(`${sellToken.symbol} BALANCE UNAVAILABLE.`);
    if (sellAmountRaw > BigInt(sellAsset.raw)) throw new Error(`AMOUNT EXCEEDS ${sellToken.symbol} BALANCE.`);
    const gasAsset = currentSession.assets.find((asset) => asset.symbol === "STRK");
    if (!gasAsset?.raw || BigInt(gasAsset.raw) === BigInt(0)) throw new Error("STRK REQUIRED FOR GAS.");
    const quotes = await getQuotes({
      sellTokenAddress: sellToken.address,
      buyTokenAddress: buyToken.address,
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
    const review = avnuSwapReview(quote, input, sellToken, buyToken, currentSession.address, generation);
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
    const [sellToken, buyToken] = validateSwapPair(prepared.review.sellSymbol, prepared.review.buySymbol);
    assertStarkzapPreset(sellToken, tokens[sellToken.presetKey]);
    assertStarkzapPreset(buyToken, tokens[buyToken.presetKey]);
    const quotes = await getQuotes({
      sellTokenAddress: sellToken.address,
      buyTokenAddress: buyToken.address,
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
      const review = avnuSwapReview(freshQuote, {
        sellAmount: prepared.review.sellAmount,
        sellSymbol: prepared.review.sellSymbol,
        buySymbol: prepared.review.buySymbol,
      }, sellToken, buyToken, prepared.accountAddress, prepared.generation);
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
      expectedSellTokenAddress: sellToken.address,
      expectedBuyTokenAddress: buyToken.address,
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
    const gasAsset = session.assets.find((asset) => asset.symbol === "STRK");
    if (!gasAsset?.raw || BigInt(gasAsset.raw) === BigInt(0)) throw new Error("STRK REQUIRED FOR GAS.");
    resetAvnuSwap();
    const result = await prepared.account.executePaymasterTransaction(calls, {
      feeMode: { mode: "default", gasToken: session.strkAddress },
      timeBounds: { executeBefore: Math.floor(Date.now() / 1000) + 300 },
    });
    if (
      prepared.generation !== sessionGenerationRef.current
      || accountRef.current !== prepared.account
      || tokenKey(session.address) !== tokenKey(prepared.accountAddress)
    ) throw new Error("SWAP SUBMITTED FROM THE PREVIOUS WALLET. CHECK THAT WALLET ON STARKSCAN.");
    return { status: "submitted" as const, transactionHash: result.transaction_hash };
  }, [resetAvnuSwap, session]);

  useEffect(() => {
    onSwapCommandsChange?.({ quote: quoteAvnuSwap, submit: submitAvnuSwap });
    return () => onSwapCommandsChange?.(null);
  }, [onSwapCommandsChange, quoteAvnuSwap, submitAvnuSwap]);

  function privateAction(): STRK20_ACTION {
    if (!session) throw new Error("CONNECT A WALLET.");
    if (!privacySupported) throw new Error("CONNECTED WALLET DOES NOT SUPPORT STRK20.");
    const asset = session.assets.find((candidate) => candidate.symbol === privateSymbol);
    if (!asset) throw new Error("TOKEN IS NOT AVAILABLE ON THIS NETWORK.");
    return buildStrk20Action({
      kind: privateKind,
      token: asset.address,
      amount: privateAmount,
      recipient: privateKind === "withdraw" ? session.address : privateRecipient,
      decimals: asset.decimals,
    }) as STRK20_ACTION;
  }

  async function runPrivateAction() {
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
    setPrivateTxHash("");
    setPrivacyStatus(action.type === "deposit"
      ? "CHECK YOUR WALLET. IT ASKS TWICE FOR ONE ORDER. A SHIELD SETTLES AS TWO ONCHAIN TRANSACTIONS: TOKEN APPROVAL, THEN THE POOL DEPOSIT."
      : "CHECK YOUR WALLET. IT ASKS TWICE FOR ONE ORDER: THE PROOF, THEN THE TRANSACTION. ONLY ONE TRANSACTION SETTLES ONCHAIN.");
    const waitHint = window.setTimeout(() => {
      setPrivacyStatus((current) => `${current} STILL WAITING? OPEN THE READY PANEL FROM THE EXTENSION BAR.`);
    }, 45_000);
    try {
      const result = await account.strk20InvokeTransaction([action]);
      if (generation !== sessionGenerationRef.current || accountRef.current !== account) return;
      setPrivateTxHash(result.transaction_hash);
      setPrivacyStatus("POOL TRANSACTION SUBMITTED. SAVE THIS HASH FOR STRK20.JSON.");
      if (providerRef.current) await refreshPrivacy(account, providerRef.current, currentSession, generation);
    } catch (error) {
      if (generation !== sessionGenerationRef.current || accountRef.current !== account) return;
      const message = error instanceof Error ? error.message : String(error);
      setPrivacyStatus(/reject|refus|denied|cancel|abort/i.test(message)
        ? "WALLET DECLINED. NOTHING WAS SUBMITTED."
        : errorLabel(error, "PRIVATE TRANSACTION FAILED. NOTHING WAS SUBMITTED."));
    } finally {
      window.clearTimeout(waitHint);
      if (generation === sessionGenerationRef.current && accountRef.current === account) {
        privateOperationRef.current = false;
        setPrivacyBusy(false);
      }
    }
  }

  if (!session) {
    const recommendedWallets = RECOMMENDED_STARKNET_WALLETS.map((information) => ({
      information,
      wallet: wallets.find((wallet) => walletMatches(wallet, information)),
    }));
    const otherWallets = wallets.filter((wallet) => !RECOMMENDED_STARKNET_WALLETS.some((information) => walletMatches(wallet, information)));
    return (
      <div className="wallet-connect-block">
        <button className="wallet-connect-button" onClick={openWalletChooser} disabled={connecting} aria-expanded={chooserOpen}>
          {connecting ? "CONNECTING…" : "CONNECT STARKNET"}
        </button>
        {chooserOpen && (
          <section className="wallet-picker" aria-label="Choose a Starknet wallet">
            <div className="wallet-picker-head"><b>STARKNET WALLETS</b><div><button onClick={() => discoveryRefreshRef.current?.()} aria-label="Refresh Starknet wallets">↻</button><button onClick={() => setChooserOpen(false)} aria-label="Close wallet chooser">×</button></div></div>
            <span className="wallet-picker-group-label">RECOMMENDED</span>
            <div className="wallet-picker-list">
              {recommendedWallets.map(({ information, wallet }) => wallet ? (
                <button className="wallet-picker-row" key={information.id} onClick={() => connectWallet(wallet)}>
                  {/* Wallet icons are packaged data URIs, not remote tracking pixels. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={wallet.icon} alt="" /><span>{information.name.toUpperCase()}<small>INSTALLED / MAINNET</small></span><i>CONNECT ↗</i>
                </button>
              ) : (
                <a className="wallet-picker-row" key={information.id} href={walletDownloadUrl(information.downloads)} target="_blank" rel="noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={information.icon} alt="" /><span>{information.name.toUpperCase()}<small>STARKNET WALLET</small></span><i>INSTALL ↗</i>
                </a>
              ))}
            </div>
            {otherWallets.length > 0 && <><span className="wallet-picker-group-label secondary">OTHER STARKNET CONNECTORS</span><div className="wallet-picker-list">
              {otherWallets.map((wallet) => (
                <button className="wallet-picker-row" key={`${walletId(wallet)}:${wallet.name}`} onClick={() => connectWallet(wallet)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={wallet.icon} alt="" /><span>{wallet.name.toUpperCase()}<small>WALLET STANDARD</small></span><i>CONNECT ↗</i>
                </button>
              ))}
            </div></>}
            <p>READY, BRAAVOS, OR XVERSE. STARKZAP HANDLES MAINNET TOKENS, QUOTES, AND TRANSACTION RAILS AFTER CONNECTION.</p>
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
      <a href={explorerAddressUrl(session.network, session.address)} target="_blank" rel="noreferrer" aria-label={`View wallet on ${explorerName(session.network)}`}>↗</a>
      <button onClick={disconnectNative} aria-label="Disconnect Starknet wallet">×</button>
      {panelOpen && (
        <section className="wallet-rail-panel">
          <div className="wallet-panel-head"><span>LIVE / {session.walletName}</span><b>{session.chainLiteral}</b></div>
          {status && <p className="privacy-wallet-status" role="status">{status}</p>}
          <div className="private-balance-strip">
            {privateBalances.length > 0 ? privateBalances.map((balance) => <div key={balance.symbol}><span>{balance.symbol}</span><b>{balance.amount}</b></div>) : <div><span>PRIVATE BALANCE</span><b>—</b></div>}
            <button onClick={() => accountRef.current && providerRef.current && refreshPrivacy(accountRef.current, providerRef.current, session, sessionGenerationRef.current)} disabled={privacyBusy || !privacySupported} aria-label="Load private balances from wallet">↻</button>
          </div>
          <div className="private-action-tabs">
            <button className={privateKind === "deposit" ? "active" : ""} onClick={() => { setPrivateKind("deposit"); resetPrivatePreview(); }}>SHIELD</button>
            <button className={privateKind === "transfer" ? "active" : ""} onClick={() => { setPrivateKind("transfer"); resetPrivatePreview(); }}>SEND</button>
            <button className={privateKind === "withdraw" ? "active" : ""} onClick={() => { setPrivateKind("withdraw"); resetPrivatePreview(); }}>UNSHIELD</button>
          </div>
          <label><span>ASSET</span><select value={privateSymbol} onChange={(event) => { setPrivateSymbol(event.target.value as PrivateBalance["symbol"]); resetPrivatePreview(); }} disabled={privacyBusy}>{CORE_TOKEN_REGISTRY.map((token) => <option value={token.symbol} key={token.symbol}>{token.symbol}</option>)}</select></label>
          <label><span>{privateSymbol} AMOUNT</span><input value={privateAmount} onChange={(event) => { setPrivateAmount(event.target.value); resetPrivatePreview(); }} inputMode="decimal" maxLength={32} /><small>PUBLIC / {session.assets.find((asset) => asset.symbol === privateSymbol)?.amount ?? "—"} {privateSymbol} · PRIVATE / {privateBalances.find((balance) => balance.symbol === privateSymbol)?.amount ?? "LOAD FROM WALLET"} {privateSymbol}</small></label>
          {privateKind === "transfer" && <label><span>PRIVATE RECIPIENT</span><input className="address-input" value={privateRecipient} onChange={(event) => { setPrivateRecipient(event.target.value); resetPrivatePreview(); }} placeholder="0X…" spellCheck={false} /></label>}
          {privateKind === "withdraw" && <p className="privacy-wallet-status">UNSHIELDS TO YOUR CONNECTED WALLET / {shortAddress(session.address)}</p>}
          <button className="wallet-rail-action private-confirm" onClick={runPrivateAction} disabled={privacyBusy || !privacySupported}>{privateKind === "deposit" ? "SHIELD IN WALLET ↗" : privateKind === "transfer" ? "SEND IN WALLET ↗" : "UNSHIELD IN WALLET ↗"}</button>
          <p className="privacy-wallet-status" aria-live="polite">{privacyStatus}</p>
          {privateTxHash && <a className="privacy-tx-link" href={explorerTransactionUrl(session.network, privateTxHash)} target="_blank" rel="noreferrer">VIEW ON {explorerName(session.network)} ↗</a>}
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
