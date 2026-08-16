"use client";

import { useEffect, useState } from "react";
import { useMainnetAccount, type PublicTransferReview } from "../../../components/mainnet-account-context";
import MainnetRouteState from "../../../components/mainnet-route-state";

export default function SendPage() {
  const { session, transferCommands } = useMainnetAccount();
  const [symbol, setSymbol] = useState<"STRK" | "USDC">("USDC");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [review, setReview] = useState<PublicTransferReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [transactionHash, setTransactionHash] = useState("");

  useEffect(() => {
    setReview(null);
    setTransactionHash("");
    setError("");
  }, [session?.address]);

  function changeDraft(update: () => void) {
    update();
    setReview(null);
    setTransactionHash("");
    setError("");
  }

  async function preview() {
    if (!transferCommands || busy) return;
    setBusy(true);
    setError("");
    try {
      setReview(await transferCommands.preview({ amount, recipient, symbol }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.toUpperCase() : "TRANSFER PREVIEW FAILED.");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!transferCommands || !review || busy) return;
    setBusy(true);
    setError("");
    try {
      const result = await transferCommands.submit(review.reviewId);
      setTransactionHash(result.transactionHash);
      setReview(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message.toUpperCase() : "TRANSFER FAILED.");
    } finally {
      setBusy(false);
    }
  }

  return <MainnetRouteState index="03" eyebrow="MOVE" title="SEND ON STARKNET." description="VALIDATE THE TOKEN, ADDRESS, AMOUNT, BALANCE, AND NETWORK FEE. THEN REVIEW THE EXACT TRANSFER BEFORE YOUR WALLET RECEIVES AN APPROVAL REQUEST." status={session ? "MAINNET LIVE" : "WALLET REQUIRED"} actions={[{ href: "/app/receive/", label: "RECEIVE" }, { href: "/app/swap/", label: "SWAP" }]}>
    {session && <section className="mainnet-transfer-card">
      <div className="mainnet-section-head"><span>PUBLIC TRANSFER</span><b>STARKNET MAINNET</b></div>
      {!transactionHash ? <div className="mainnet-transfer-form">
        <label><span>ASSET</span><select value={symbol} disabled={busy || Boolean(review)} onChange={(event) => changeDraft(() => setSymbol(event.target.value as "STRK" | "USDC"))}><option>USDC</option><option>STRK</option></select></label>
        <label><span>RECIPIENT</span><input value={recipient} disabled={busy || Boolean(review)} onChange={(event) => changeDraft(() => setRecipient(event.target.value))} placeholder="0X…" spellCheck={false} /></label>
        <label><span>AMOUNT</span><input value={amount} disabled={busy || Boolean(review)} onChange={(event) => changeDraft(() => setAmount(event.target.value))} inputMode="decimal" placeholder="0.00" /></label>
        {!review ? <button onClick={preview} disabled={busy || !transferCommands || !recipient || !amount}>{busy ? "CHECKING…" : "REVIEW TRANSFER ↗"}</button> : <div className="mainnet-transfer-review">
          <span>YOU SEND</span><strong>{review.amount} {review.symbol}</strong>
          <span>TO</span><b>{review.recipient}</b>
          <span>ESTIMATED NETWORK FEE</span><b>{review.fee}</b>
          <small>SUBMISSION STILL REQUIRES A SEPARATE WALLET APPROVAL.</small>
          <div><button className="secondary" onClick={() => setReview(null)} disabled={busy}>EDIT</button><button onClick={submit} disabled={busy}>{busy ? "AWAITING WALLET…" : "CONFIRM IN WALLET ↗"}</button></div>
        </div>}
        {error && <p className="mainnet-transfer-error" role="alert">{error}</p>}
      </div> : <div className="mainnet-transfer-receipt">
        <span>SUBMITTED TO STARKNET</span><h2>TRANSFER SUBMITTED.</h2><p>A TRANSACTION HASH IS NOT FINAL SETTLEMENT. VERIFY ACCEPTANCE OR REVERT ON STARKSCAN.</p><b>{transactionHash}</b><a href={`https://starkscan.co/tx/${transactionHash}`} target="_blank" rel="noreferrer">TRACK ON STARKSCAN ↗</a>
      </div>}
    </section>}
  </MainnetRouteState>;
}
