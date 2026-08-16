"use client";

import { useEffect, useState } from "react";
import { useMainnetAccount, type AvnuSwapReview } from "../../../components/mainnet-account-context";
import MainnetRouteState from "../../../components/mainnet-route-state";

export default function SwapPage() {
  const { session, swapCommands } = useMainnetAccount();
  const [sellAmount, setSellAmount] = useState("");
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

  async function quote() {
    if (!swapCommands || busy) return;
    setBusy(true);
    setError("");
    setRepriced(false);
    try {
      setReview(await swapCommands.quote(sellAmount));
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

  return <MainnetRouteState index="03" eyebrow="MOVE" title="SWAP WITH AVNU." description="GET A LIVE MAINNET QUOTE. REVIEW THE EXACT STRK INPUT, USDC OUTPUT FLOOR, ROUTE, AND PRICE IMPACT. THEN APPROVE THE SWAP IN YOUR WALLET." status={session ? "MAINNET LIVE" : "WALLET REQUIRED"} actions={[{ href: "/app/send/", label: "SEND" }, { href: "/app/assets/", label: "ASSETS" }]}>
    {session && <section className="mainnet-swap-card">
      <div className="mainnet-section-head"><span>STRK → USDC</span><b>ROUTED BY AVNU</b></div>
      {!transactionHash ? <div className="mainnet-swap-form">
        <div className="mainnet-swap-input">
          <label><span>YOU SELL</span><input value={sellAmount} disabled={busy || Boolean(review)} onChange={(event) => editAmount(event.target.value)} inputMode="decimal" placeholder="0.00" /></label>
          <b>STRK</b>
          <small>AVAILABLE / {session.assets.find((asset) => asset.symbol === "STRK")?.amount ?? "—"} STRK</small>
        </div>
        {!review ? <button onClick={quote} disabled={busy || !swapCommands || !sellAmount}>{busy ? "QUOTING…" : "GET LIVE QUOTE ↗"}</button> : <div className="mainnet-swap-review">
          {repriced && <p role="status">QUOTE MOVED. REVIEW THE NEW OUTPUT BEFORE APPROVING.</p>}
          <span>YOU SELL</span><strong>{review.sellAmount} STRK</strong>
          <span>EXPECTED</span><strong>{review.buyAmount} USDC</strong>
          <span>MINIMUM RECEIVED</span><b>{review.minimumBuyAmount} USDC</b>
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
