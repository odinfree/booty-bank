"use client";

import type { Quote } from "@avnu/avnu-sdk";
import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import type { WalletAccount } from "starknet";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PrivyStarknetWallet = dynamic(() => import("./privy-starknet-wallet"), { ssr: false });

type NetworkName = "mainnet" | "sepolia";
type NativeSession = {
  address: string;
  balance: string;
  chainLiteral: "SN_MAIN" | "SN_SEPOLIA";
  network: NetworkName;
  walletName: string;
};

function shortAddress(address: string) {
  return address.length > 16 ? `${address.slice(0, 7)}…${address.slice(-5)}` : address;
}

function networkFromChain(chainId?: string): NetworkName {
  const normalized = chainId?.toUpperCase() ?? "";
  return normalized.includes("SEP") || normalized === "0X534E5F5345504F4C4941" ? "sepolia" : "mainnet";
}

function voyagerAddressUrl(network: NetworkName, address: string) {
  const host = network === "sepolia" ? "https://sepolia.voyager.online" : "https://voyager.online";
  return `${host}/contract/${address}`;
}

async function nativeSession(account: WalletAccount, walletName: string): Promise<NativeSession> {
  const { Amount, ChainId, getPresets } = await import("starkzap");
  const feltChainId = await account.getChainId();
  const chainId = ChainId.fromFelt252(feltChainId);
  const network = chainId.isSepolia() ? "sepolia" : "mainnet";
  const token = getPresets(chainId).STRK;
  let balance = "— STRK";
  try {
    const result = await account.callContract({
      contractAddress: token.address,
      entrypoint: "balance_of",
      calldata: [account.address],
    });
    const low = BigInt(result[0] ?? 0);
    const high = BigInt(result[1] ?? 0);
    balance = Amount.fromRaw(low + (high << BigInt(128)), token).toFormatted(true);
  } catch {
    // A connected wallet remains usable when a public RPC balance read is temporarily unavailable.
  }
  return {
    address: account.address,
    balance,
    chainLiteral: chainId.toLiteral(),
    network,
    walletName,
  };
}

function NativeStarknetWallet() {
  const accountRef = useRef<WalletAccount | null>(null);
  const [session, setSession] = useState<NativeSession | null>(null);
  const [status, setStatus] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [swapOpen, setSwapOpen] = useState(false);
  const [sellAmount, setSellAmount] = useState("10");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteLabel, setQuoteLabel] = useState("");
  const [txHash, setTxHash] = useState("");
  const [railBusy, setRailBusy] = useState(false);

  const attachWallet = useCallback(async (walletProvider: unknown, subscribe = true) => {
    const { WalletAccount } = await import("starknet");
    const walletChainId = (walletProvider as { chainId?: string }).chainId;
    const network = networkFromChain(walletChainId);
    const { networks } = await import("starkzap");
    const rpcUrl = process.env.NEXT_PUBLIC_STARKNET_RPC_URL || networks[network].rpcUrl;
    const account = await WalletAccount.connect({ nodeUrl: rpcUrl }, walletProvider as never);
    accountRef.current = account;
    const name = (walletProvider as { name?: string }).name ?? "STARKNET WALLET";
    setSession(await nativeSession(account, name.toUpperCase()));
    setStatus("");

    if (subscribe) {
      account.onAccountChange(async () => {
        try {
          await attachWallet(walletProvider, false);
        } catch {
          setStatus("ACCOUNT REFRESH FAILED.");
        }
      });
      account.onNetworkChanged(async () => {
        try {
          await attachWallet(walletProvider, false);
        } catch {
          setStatus("NETWORK REFRESH FAILED.");
        }
      });
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const { connect } = await import("@starknet-io/get-starknet");
        const wallet = await connect({ modalMode: "neverAsk", modalTheme: "dark" });
        if (active && wallet) await attachWallet(wallet);
      } catch {
        // Silent restore should never interrupt the product UI.
      }
    })();
    return () => { active = false; };
  }, [attachWallet]);

  async function connectNative() {
    setConnecting(true);
    setStatus("");
    try {
      const { connect } = await import("@starknet-io/get-starknet");
      const wallet = await connect({ modalMode: "alwaysAsk", modalTheme: "dark" });
      if (!wallet) {
        setStatus("NO WALLET SELECTED.");
        return;
      }
      await attachWallet(wallet);
    } catch (error) {
      setStatus(error instanceof Error ? error.message.toUpperCase().slice(0, 90) : "WALLET CONNECTION FAILED.");
    } finally {
      setConnecting(false);
    }
  }

  async function disconnectNative() {
    const { disconnect } = await import("@starknet-io/get-starknet");
    await disconnect();
    accountRef.current = null;
    setSession(null);
    setQuote(null);
    setSwapOpen(false);
    setTxHash("");
  }

  async function fetchAvnuQuote() {
    if (!session || !accountRef.current) return;
    setQuote(null);
    setTxHash("");
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
      setQuoteLabel(error instanceof Error ? error.message.toUpperCase().slice(0, 90) : "QUOTE FAILED.");
    } finally {
      setRailBusy(false);
    }
  }

  async function executeAvnuSwap() {
    if (!quote || !accountRef.current || !session) return;
    setQuoteLabel("CONFIRM IN WALLET…");
    setRailBusy(true);
    try {
      const { executeSwap, SEPOLIA_BASE_URL } = await import("@avnu/avnu-sdk");
      const options = session.network === "sepolia" ? { baseUrl: SEPOLIA_BASE_URL } : undefined;
      const result = await executeSwap({
        provider: accountRef.current,
        quote,
        slippage: 0.005,
        executeApprove: true,
      }, options);
      setTxHash(result.transactionHash);
      setQuoteLabel("SUBMITTED TO STARKNET.");
      setSession(await nativeSession(accountRef.current, session.walletName));
    } catch (error) {
      setQuoteLabel(error instanceof Error ? error.message.toUpperCase().slice(0, 90) : "SWAP REJECTED.");
    } finally {
      setRailBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="wallet-connect-block">
        <button className="wallet-connect-button" onClick={connectNative} disabled={connecting}>
          {connecting ? "CONNECTING…" : "CONNECT STARKNET"}
        </button>
        {status && <span className="wallet-inline-error" role="status">{status}</span>}
      </div>
    );
  }

  return (
    <div className="wallet-session">
      <button className="wallet-session-main" onClick={() => setSwapOpen(!swapOpen)} aria-expanded={swapOpen}>
        <span>{session.chainLiteral === "SN_MAIN" ? "MAINNET" : "SEPOLIA"}</span>
        <b>{shortAddress(session.address)}</b>
        <strong>{session.balance}</strong>
      </button>
      <a href={voyagerAddressUrl(session.network, session.address)} target="_blank" rel="noreferrer" aria-label="View wallet on Voyager">↗</a>
      <button onClick={disconnectNative} aria-label="Disconnect Starknet wallet">×</button>
      {swapOpen && (
        <div className="wallet-rail-panel">
          <div><span>LIVE RAIL</span><b>{session.walletName}</b></div>
          <label><span>SELL STRK</span><input value={sellAmount} onChange={(event) => { setSellAmount(event.target.value); setQuote(null); setTxHash(""); }} inputMode="decimal" maxLength={32} /></label>
          <div className="wallet-quote"><span>GET USDC</span><b>{quoteLabel || "GET A LIVE AVNU QUOTE"}</b></div>
          {!quote && <button className="wallet-rail-action" onClick={fetchAvnuQuote} disabled={railBusy}>QUOTE ON AVNU ↗</button>}
          {quote && !txHash && <button className="wallet-rail-action" onClick={executeAvnuSwap} disabled={railBusy}>SWAP / 0.5% MAX SLIPPAGE ↗</button>}
          {txHash && <a className="wallet-rail-action" href={voyagerAddressUrl(session.network, txHash).replace("/contract/", "/tx/")} target="_blank" rel="noreferrer">VIEW TRANSACTION ↗</a>}
        </div>
      )}
    </div>
  );
}

export default function StarknetWalletControl() {
  return (
    <div className="starknet-wallet-control" aria-label="Starknet wallet controls">
      <NativeStarknetWallet />
      {PRIVY_APP_ID ? <PrivyStarknetWallet /> : null}
    </div>
  );
}
