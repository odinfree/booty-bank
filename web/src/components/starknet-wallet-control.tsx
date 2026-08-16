"use client";

import type { Quote } from "@avnu/avnu-sdk";
import type { WalletWithStarknetFeatures } from "@starknet-io/get-starknet-wallet-standard/features";
import { useCallback, useEffect, useRef, useState } from "react";
import type { RpcProvider, STRK20_ACTION, WalletAccountV6 } from "starknet";
import { validateAvnuSwapCalls } from "../lib/avnu-policy.mjs";
import { buildStrk20Action, formatTokenAmount } from "../lib/strk20.mjs";
import PrivyPlaceholder from "./privy-placeholder";

type NetworkName = "mainnet" | "sepolia";
type NativeSession = {
  address: string;
  balance: string;
  chainLiteral: "SN_MAIN" | "SN_SEPOLIA";
  network: NetworkName;
  strkAddress: string;
  usdcAddress: string;
  walletName: string;
};
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

const WALLET_SESSION_KEY = "bootybank.wallet-session.v1";
const AVNU_PAYMASTER_PROXY = process.env.NEXT_PUBLIC_AVNU_PAYMASTER_URL ?? "https://bootybank.app/api/paymaster";
const AVNU_MAINNET_PAYMASTER = "https://starknet.paymaster.avnu.fi";
const SWAP_SLIPPAGE = 0.005;

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

async function nativeSession(account: WalletAccountV6, provider: RpcProvider, walletName: string): Promise<NativeSession> {
  const { Amount, ChainId, getPresets } = await import("starkzap");
  const feltChainId = await provider.getChainId();
  const network = networkFromChain(feltChainId);
  if (!network) throw new Error("UNSUPPORTED STARKNET NETWORK.");
  const chainId = ChainId.fromFelt252(feltChainId);
  const tokens = getPresets(chainId);
  let balance = "— STRK";
  try {
    const result = await provider.callContract({
      contractAddress: tokens.STRK.address,
      entrypoint: "balance_of",
      calldata: [account.address],
    });
    const low = BigInt(result[0] ?? 0);
    const high = BigInt(result[1] ?? 0);
    balance = Amount.fromRaw(low + (high << BigInt(128)), tokens.STRK).toFormatted(true);
  } catch {
    // A connected wallet remains usable when a public RPC balance read is temporarily unavailable.
  }
  return {
    address: account.address,
    balance,
    chainLiteral: chainId.toLiteral(),
    network,
    strkAddress: tokens.STRK.address,
    usdcAddress: tokens.USDC.address,
    walletName,
  };
}

function NativeStarknetWallet() {
  const accountRef = useRef<WalletAccountV6 | null>(null);
  const providerRef = useRef<RpcProvider | null>(null);
  const walletRef = useRef<WalletWithStarknetFeatures | null>(null);
  const walletEventCleanupRef = useRef<null | (() => void)>(null);
  const privateOperationRef = useRef(false);
  const preparedPrivateActionRef = useRef<PreparedPrivateAction | null>(null);
  const sessionGenerationRef = useRef(0);
  const restoreAttemptRef = useRef(false);
  const [wallets, setWallets] = useState<WalletWithStarknetFeatures[]>([]);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [session, setSession] = useState<NativeSession | null>(null);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMode, setPanelMode] = useState<"private" | "swap">("private");
  const [sellAmount, setSellAmount] = useState("10");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLabel, setQuoteLabel] = useState("");
  const [swapTxHash, setSwapTxHash] = useState("");
  const [railBusy, setRailBusy] = useState(false);
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
    const { RpcProvider, WalletAccountV6 } = await import("starknet");
    const walletChain = wallet.accounts[0]?.chains[0];
    const networkCandidates = [walletChain, ...wallet.chains].map((chain) => networkFromChain(chain)).filter((value): value is NetworkName => value !== null);
    let network = networkCandidates[0];
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
    setChooserOpen(false);
    setStatus("");
    setQuote(null);
    setQuoteLabel("");
    setSwapTxHash("");
    window.localStorage.setItem(WALLET_SESSION_KEY, JSON.stringify({ walletId: walletId(wallet), address: nextSession.address }));
    walletEventCleanupRef.current = account.onChange(() => {
      sessionGenerationRef.current += 1;
      resetPrivatePreview();
      void attachWallet(wallet, true).catch(() => setStatus("ACCOUNT REFRESH FAILED."));
    });
    void refreshPrivacy(account, provider, nextSession, generation);
  }, [refreshPrivacy, resetPrivatePreview]);

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
      setQuote(null);
      setSwapTxHash("");
      setPanelOpen(false);
      setPrivateBalances([]);
      setShadow(null);
      setPrivacyBusy(false);
      window.localStorage.removeItem(WALLET_SESSION_KEY);
    }
  }

  async function fetchAvnuQuote() {
    if (!session || !accountRef.current) return;
    setQuote(null);
    setQuoteLabel("QUOTING…");
    setRailBusy(true);
    try {
      const [{ getQuotes, SEPOLIA_BASE_URL }, { Amount, ChainId, getPresets }] = await Promise.all([
        import("@avnu/avnu-sdk"),
        import("starkzap"),
      ]);
      const chainId = session.network === "sepolia" ? ChainId.SEPOLIA : ChainId.MAINNET;
      const tokens = getPresets(chainId);
      const amount = Amount.parse(sellAmount, tokens.STRK).toBase();
      if (amount <= BigInt(0)) throw new Error("ENTER AN AMOUNT.");
      const options = session.network === "sepolia" ? { baseUrl: SEPOLIA_BASE_URL } : undefined;
      const quotes = await getQuotes({
        sellTokenAddress: tokens.STRK.address,
        buyTokenAddress: tokens.USDC.address,
        sellAmount: amount,
        takerAddress: session.address,
        size: 1,
      }, options);
      if (!quotes[0]) throw new Error("NO AVNU ROUTE.");
      setQuote(quotes[0]);
      setQuoteLabel(Amount.fromRaw(quotes[0].buyAmount, tokens.USDC).toFormatted(true));
    } catch (error) {
      setQuoteLabel(errorLabel(error, "QUOTE FAILED."));
    } finally {
      setRailBusy(false);
    }
  }

  async function executeAvnuSwap() {
    const account = accountRef.current;
    const currentSession = session;
    if (!account || !currentSession || railBusy) return;
    const generation = sessionGenerationRef.current;
    setRailBusy(true);
    setSwapTxHash("");
    setQuoteLabel("REFRESHING QUOTE…");
    try {
      const [{ getQuotes, quoteToCalls }, { Amount, ChainId, getPresets }] = await Promise.all([
        import("@avnu/avnu-sdk"),
        import("starkzap"),
      ]);
      const chainId = currentSession.network === "sepolia" ? ChainId.SEPOLIA : ChainId.MAINNET;
      const tokens = getPresets(chainId);
      const amount = Amount.parse(sellAmount, tokens.STRK).toBase();
      const quotes = await getQuotes({
        sellTokenAddress: tokens.STRK.address,
        buyTokenAddress: tokens.USDC.address,
        sellAmount: amount,
        takerAddress: currentSession.address,
        size: 1,
      });
      const freshQuote = quotes[0];
      if (!freshQuote) throw new Error("NO FRESH AVNU ROUTE.");
      const built = await quoteToCalls({
        quoteId: freshQuote.quoteId,
        slippage: SWAP_SLIPPAGE,
        takerAddress: currentSession.address,
        executeApprove: true,
      });
      const calls = validateAvnuSwapCalls({ built, quote: freshQuote, takerAddress: currentSession.address, slippage: SWAP_SLIPPAGE });
      if (
        generation !== sessionGenerationRef.current
        || accountRef.current !== account
        || tokenKey(currentSession.address) !== tokenKey(session.address)
      ) throw new Error("WALLET CHANGED. QUOTE AGAIN.");
      setQuote(freshQuote);
      setQuoteLabel("APPROVE GAS + SWAP IN WALLET…");
      const result = await account.executePaymasterTransaction(calls, {
        feeMode: currentSession.network === "sepolia"
          ? { mode: "sponsored" }
          : { mode: "default", gasToken: currentSession.strkAddress },
        timeBounds: { executeBefore: Math.floor(Date.now() / 1000) + 300 },
      });
      setSwapTxHash(result.transaction_hash);
      setQuoteLabel(Amount.fromRaw(freshQuote.buyAmount, tokens.USDC).toFormatted(true));
    } catch (error) {
      setQuoteLabel(errorLabel(error, "AVNU SWAP FAILED."));
    } finally {
      setRailBusy(false);
    }
  }

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
          <div className="wallet-panel-tabs" role="tablist" aria-label="Wallet rail">
            <button role="tab" aria-selected={panelMode === "private"} className={panelMode === "private" ? "active" : ""} onClick={() => setPanelMode("private")}>PRIVATE</button>
            <button role="tab" aria-selected={panelMode === "swap"} className={panelMode === "swap" ? "active" : ""} onClick={() => setPanelMode("swap")}>SWAP</button>
          </div>
          {panelMode === "swap" ? (
            <>
              <label><span>SELL STRK</span><input value={sellAmount} onChange={(event) => { setSellAmount(event.target.value); setQuote(null); setSwapTxHash(""); }} inputMode="decimal" maxLength={32} /></label>
              <div className="wallet-quote"><span>GET USDC</span><b>{quoteLabel || "GET A LIVE AVNU QUOTE"}</b></div>
              <div className="avnu-quote-grid">
                <span>GAS</span><b>{session.network === "sepolia" ? "BOOTY BANK SPONSORED" : "PAY IN STRK"}</b>
                <span>SLIPPAGE CAP</span><b>0.5%</b>
                {quote && <><span>ROUTE</span><b>{[...new Set(quote.routes.map((route) => route.name))].join(" + ") || "AVNU"}</b><span>PRICE IMPACT</span><b>{(quote.priceImpact / 100).toFixed(2)}%</b></>}
              </div>
              {!quote && <button className="wallet-rail-action" onClick={fetchAvnuQuote} disabled={railBusy}>QUOTE ON AVNU ↗</button>}
              {quote && <button className="wallet-rail-action private-confirm" onClick={executeAvnuSwap} disabled={railBusy}>SWAP WITH AVNU PAYMASTER ↗</button>}
              {swapTxHash && <a className="privacy-tx-link" href={`${session.network === "sepolia" ? "https://sepolia.voyager.online" : "https://voyager.online"}/tx/${swapTxHash}`} target="_blank" rel="noreferrer">VIEW SWAP ↗</a>}
            </>
          ) : (
            <>
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
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default function StarknetWalletControl() {
  return (
    <div className="starknet-wallet-control" aria-label="Starknet wallet controls">
      <NativeStarknetWallet />
      <PrivyPlaceholder />
    </div>
  );
}
