"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useCallback, useRef, useState } from "react";
import { useModalFocus } from "../hooks/use-modal-focus";

const PRIVY_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
const WALLET_API_URL = process.env.NEXT_PUBLIC_PRIVY_WALLET_API_URL ?? "https://bootybank.app/api/wallet/starknet";

type StarknetWallet = {
  privyAddress: string;
  publicKey: string;
};

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function PreviewPanel() {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState("PREVIEW ONLY. NO ACCOUNT CREATED.");
  const dialogRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useModalFocus(open, dialogRef, close);

  function preview(method: "GOOGLE" | "EMAIL") {
    setStatus(`${method} LOCKED UNTIL SIGNING POLICY PASSES.`);
  }

  return (
    <div className="wallet-connect-block privy-placeholder">
      <button
        className="wallet-connect-button privy-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="privy-preview-panel"
      >
        <span className="privy-label-wide">SOCIAL LOGIN</span>
        <span className="privy-label-short">LOGIN</span>
      </button>
      {open && (
        <section ref={dialogRef} tabIndex={-1} className="privy-preview-panel" id="privy-preview-panel" role="dialog" aria-modal="true" aria-labelledby="privy-preview-title">
          <div className="privy-preview-head">
            <span>PRIVY / PREVIEW</span>
            <button onClick={close} aria-label="Close social login preview">×</button>
          </div>
          <h4 id="privy-preview-title">SIGN IN.</h4>
          <div className="privy-preview-actions">
            <button onClick={() => preview("GOOGLE")}><i>G</i> GOOGLE <span>↗</span></button>
            <button onClick={() => preview("EMAIL")}><i>@</i> EMAIL <span>↗</span></button>
          </div>
          <p aria-live="polite">{status}</p>
        </section>
      )}
    </div>
  );
}

function LivePanel() {
  const [open, setOpen] = useState(false);
  const [wallet, setWallet] = useState<StarknetWallet | null>(null);
  const [status, setStatus] = useState("SIGN IN WITH GOOGLE OR EMAIL.");
  const [creating, setCreating] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const close = useCallback(() => setOpen(false), []);
  const { ready, authenticated, getAccessToken, logout } = usePrivy();
  const { login } = useLogin({
    onComplete: () => setStatus("SIGNED IN. CREATE YOUR STARKNET ACCOUNT."),
    onError: () => setStatus("LOGIN FAILED. TRY AGAIN."),
  });
  useModalFocus(open, dialogRef, close);

  async function createAccount() {
    if (!ready || !authenticated || creating) return;
    setCreating(true);
    setStatus("CREATING STARKNET ACCOUNT…");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("missing access token");
      const response = await fetch(WALLET_API_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const body = await response.json() as Partial<StarknetWallet> & { message?: string };
      if (!response.ok || !body.privyAddress || !body.publicKey) {
        throw new Error(body.message || "wallet unavailable");
      }
      setWallet({ privyAddress: body.privyAddress, publicKey: body.publicKey });
      setStatus("PRIVY KEY READY. ACCOUNT NOT DEPLOYED.");
    } catch {
      setStatus("ACCOUNT CREATION FAILED. TRY AGAIN.");
    } finally {
      setCreating(false);
    }
  }

  async function signOut() {
    await logout();
    setWallet(null);
    setStatus("SIGNED OUT.");
  }

  return (
    <div className="wallet-connect-block privy-placeholder">
      <button
        className="wallet-connect-button privy-button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="privy-live-panel"
      >
        <span className="privy-label-wide">{authenticated ? "PRIVY READY" : "SOCIAL LOGIN"}</span>
        <span className="privy-label-short">{authenticated ? "READY" : "LOGIN"}</span>
      </button>
      {open && (
        <section ref={dialogRef} tabIndex={-1} className="privy-preview-panel" id="privy-live-panel" role="dialog" aria-modal="true" aria-labelledby="privy-live-title">
          <div className="privy-preview-head">
            <span>PRIVY / LIVE</span>
            <button onClick={close} aria-label="Close social login">×</button>
          </div>
          <h4 id="privy-live-title">{authenticated ? "ACCOUNT." : "SIGN IN."}</h4>
          {!ready && <p>LOADING PRIVY…</p>}
          {ready && !authenticated && (
            <div className="privy-preview-actions">
              <button onClick={() => login({ loginMethods: ["google"] })}><i>G</i> GOOGLE <span>↗</span></button>
              <button onClick={() => login({ loginMethods: ["email"] })}><i>@</i> EMAIL <span>↗</span></button>
            </div>
          )}
          {ready && authenticated && (
            <div className="privy-account-actions">
              {!wallet && <button onClick={createAccount} disabled={creating}>{creating ? "CREATING…" : "CREATE STARKNET ACCOUNT"}</button>}
              {wallet && <strong title={wallet.privyAddress}>{shortAddress(wallet.privyAddress)}</strong>}
              <button className="privy-secondary-action" onClick={signOut}>LOG OUT</button>
            </div>
          )}
          <p aria-live="polite">{status}</p>
        </section>
      )}
    </div>
  );
}

export default function PrivyPlaceholder() {
  return PRIVY_CONFIGURED ? <LivePanel /> : <PreviewPanel />;
}
