"use client";

import { useEffect, useState } from "react";
import { useMainnetAccount, type AvnuSwapReview } from "../../../components/mainnet-account-context";
import MainnetRouteState from "../../../components/mainnet-route-state";
import { CORE_TOKEN_REGISTRY } from "../../../lib/token-registry.mjs";
import type { CoreTokenSymbol } from "../../../lib/token-registry.mjs";

export default function SwapPage() {
  const { session, swapCommands } = useMainnetAccount();
  const [sellAmount, setSellAmount] = useState("");
  const [sellSymbol, setSellSymbol] = useState<CoreTokenSymbol>("STRK");
  const [buySymbol, setBuySymbol] = useState<CoreTokenSymbol>("USDC");
  const [review, setReview] = useState<AvnuSwapReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [repriced, setRepriced] = useState(false);
  const [transactionHash, setTransactionHash] = useState("");

  useEffect(() => {
    setReview(null);
    setTransactionHash("");
    setError("");
    setRepriced(false);
  }, [session?.address]);

  function editAmount(value: string) {
    setSellAmount(value);
    setReview(null);
    setTransactionHash("");
    setError("");
    setRepriced(false);
  }

  function editPair(nextSell: CoreTokenSymbol, nextBuy: CoreTokenSymbol) {
    if (nextSell === nextBuy) return;
    setSellSymbol(nextSell);
    setBuySymbol(nextBuy);
    setReview(null);
    setTransactionHash("");
    setError("");
    setRepriced(false);
  }

  async function quote() {
    if (!swapCommands || busy) return;
    setBusy(true);
    setError("");
    setRepriced(false);
    try {
      setReview(await swapCommands.quote({ sellAmount, sellSymbol, buySymbol }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.toUpperCase() : "AVNU QUOTE FAILED.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!swapCommands || !review || busy) return;
    setBusy(true);
    setError("");
    setRepriced(false);
    try {
      const result = await swapCommands.submit(review.reviewId);
      if (result.status === "repriced") {
        setReview(result.review);
        setRepriced(true);
        return;
      }
      setTransactionHash(result.transactionHash);
      setReview(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.toUpperCase() : "AVNU SWAP FAILED.");
    } finally {
      setBusy(false);
    }
  }

  return <MainnetRouteState index="03" eyebrow="MOVE" title="SWAP WITH AVNU." description="BUY OR SELL CORE STARKNET ASSETS. REVIEW THE EXACT INPUT, OUTPUT FLOOR, ROUTE, AND PRICE IMPACT. THEN APPROVE IN YOUR WALLET." status={session ? "MAINNET LIVE" : "WALLET REQUIRED"} actions={[{ href: "/app/send/", label: "SEND" }, { href: "/app/assets/", label: "ASSETS" }]}>
    {session && <section className="mainnet-swap-card">
      <div className="mainnet-section-head"><span>{sellSymbol} → {buySymbol}</span><b>ROUTED BY AVNU</b></div>
      {!transactionHash ? <div className="mainnet-swap-form">
        <div className="swap-pair-controls">
          <label><span>SELL</span><select value={sellSymbol} disabled={busy || Boolean(review)} onChange={(event) => editPair(event.target.value as CoreTokenSymbol, buySymbol)}>{CORE_TOKEN_REGISTRY.map((token) => <option key={token.symbol} value={token.symbol} disabled={token.symbol === buySymbol}>{token.symbol}</option>)}</select></label>
          <button type="button" aria-label="FLIP PAIR" disabled={busy || Boolean(review)} onClick={() => editPair(buySymbol, sellSymbol)}>⇄</button>
          <label><span>BUY</span><select value={buySymbol} disabled={busy || Boolean(review)} onChange={(event) => editPair(sellSymbol, event.target.value as CoreTokenSymbol)}>{CORE_TOKEN_REGISTRY.map((token) => <option key={token.symbol} value={token.symbol} disabled={token.symbol === sellSymbol}>{token.symbol}</option>)}</select></label>
        </div>
        <div className="mainnet-swap-input">
          <label><span>YOU SELL</span><input value={sellAmount} disabled={busy || Boolean(review)} onChange={(event) => editAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></label>
          <b>{sellSymbol}</b>
          <small>AVAILABLE / {session.assets.find((asset) => asset.symbol === sellSymbol)?.amount ?? "—"} {sellSymbol}</small>
        </div>
        {!review ? <button onClick={quote} disabled={busy || !swapCommands || !sellAmount}>{busy ? "QUOTING…" : "GET LIVE QUOTE ↗"}</button> : <div className="mainnet-swap-review">
          {repriced && <p role="status">QUOTE MOVED. REVIEW THE NEW OUTPUT BEFORE APPROVING.</p>}
          <span>YOU SELL</span><strong>{review.sellAmount} {review.sellSymbol}</strong>
          <span>EXPECTED</span><strong>{review.buyAmount} {review.buySymbol}</strong>
          <span>MINIMUM RECEIVED</span><b>{review.minimumBuyAmount} {review.buySymbol}</b>
          <span>ROUTE</span><b>{review.route}</b>
          <span>PRICE IMPACT</span><b>{review.priceImpact}</b>
          <span>GAS</span><b>PAID IN STRK</b>
          <small>IF THE EXECUTABLE OUTPUT FALLS BELOW THIS REVIEWED FLOOR, NO WALLET REQUEST IS SENT. YOU RECEIVE A NEW QUOTE TO REVIEW.</small>
          <div><button className="secondary" onClick={() => { setReview(null); setRepriced(false); }} disabled={busy}>EDIT</button><button onClick={submit} disabled={busy}>{busy ? "REFRESHING ROUTE…" : "CONFIRM IN WALLET ↗"}</button></div>
        </div>}
        {error && <p className="mainnet-transfer-error" role="alert">{error}</p>}
      </div> : <div className="mainnet-transfer-receipt">
        <span>SUBMITTED TO STARKNET</span><h2>SWAP SUBMITTED.</h2><p>THE WALLET RETURNED A TRANSACTION HASH. VERIFY ACCEPTANCE OR REVERT ON STARKSCAN.</p><b>{transactionHash}</b><a href={`https://starkscan.co/tx/${transactionHash}`} target="_blank" rel="noreferrer">TRACK ON STARKSCAN ↗</a>
      </div>}
    </section>}
  </MainnetRouteState>;
}
