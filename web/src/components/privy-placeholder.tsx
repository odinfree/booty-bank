"use client";

import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useCallback, useRef, useState } from "react";
import type { WalletInterface } from "starkzap";
import { useModalFocus } from "../hooks/use-modal-focus";

const PRIVY_CONFIGURED = Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID);
const WALLET_API_URL = process.env.NEXT_PUBLIC_PRIVY_WALLET_API_URL ?? "https://bootybank.app/api/wallet/starknet";
const SIGNING_CHALLENGE_URL = `${WALLET_API_URL.replace(/\/+$/, "")}/challenge`;
const SIGNING_URL = `${WALLET_API_URL.replace(/\/+$/, "")}/sign`;
const SIGNING_PURPOSE = "bootybank-session-proof";

type PrivyWallet = {
  walletId: string;
  privyAddress: string;
  publicKey: string;
};

type StarknetAccount = PrivyWallet & {
  accountAddress: string;
  deployed: boolean;
};

type SigningChallenge = {
  challengeId: string;
  expiresAt: number;
  hash: string;
  purpose: typeof SIGNING_PURPOSE;
};

function shortAddress(address: string) {
  return `${address.slice(0, 8)}…${address.slice(-6)}`;
}

function errorStatus(error: unknown) {
  return error instanceof Error
    ? error.message.toUpperCase().slice(0, 120)
    : "ACCOUNT CONNECTION FAILED. TRY AGAIN.";
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
  const [wallet, setWallet] = useState<StarknetAccount | null>(null);
  const [status, setStatus] = useState("SIGN IN WITH GOOGLE OR EMAIL.");
  const [creating, setCreating] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const starkzapWalletRef = useRef<WalletInterface | null>(null);
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
      const bearerHeaders = async () => {
        const token = await getAccessToken();
        if (!token) throw new Error("PRIVY SESSION EXPIRED. SIGN IN AGAIN.");
        return { Authorization: `Bearer ${token}` };
      };
      const headers = await bearerHeaders();
      const response = await fetch(WALLET_API_URL, {
        method: "POST",
        headers,
      });
      const body = await response.json() as Partial<PrivyWallet> & { message?: string };
      if (!response.ok || !body.walletId || !body.privyAddress || !body.publicKey) {
        throw new Error(body.message || "wallet unavailable");
      }
      const privyWallet: PrivyWallet = {
        walletId: body.walletId,
        privyAddress: body.privyAddress,
        publicKey: body.publicKey,
      };

      const { OnboardStrategy, PrivySigner, StarkZap } = await import("starkzap");
      const network = process.env.NEXT_PUBLIC_STARKNET_NETWORK === "sepolia" ? "sepolia" : "mainnet";
      const rpcUrl = process.env.NEXT_PUBLIC_STARKNET_RPC_URL;
      const sdk = new StarkZap({ network, ...(rpcUrl ? { rpcUrl } : {}) });
      let activeChallenge: SigningChallenge | null = null;
      const signerConfig = {
        walletId: privyWallet.walletId,
        publicKey: privyWallet.publicKey,
        serverUrl: SIGNING_URL,
        headers: bearerHeaders,
        buildBody: ({ walletId, hash }: { walletId: string; hash: string }) => {
          if (!activeChallenge || activeChallenge.purpose !== SIGNING_PURPOSE) {
            throw new Error("SIGNING IS LIMITED TO A FRESH OWNERSHIP PROOF.");
          }
          if (BigInt(hash) !== BigInt(activeChallenge.hash)) {
            throw new Error("SIGNING CHALLENGE DOES NOT MATCH.");
          }
          const payload = {
            challengeId: activeChallenge.challengeId,
            hash,
            purpose: activeChallenge.purpose,
            walletId,
          };
          activeChallenge = null;
          return payload;
        },
      };

      const onboard = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        deploy: "never",
        privy: { resolve: async () => signerConfig },
      });

      const challengeResponse = await fetch(SIGNING_CHALLENGE_URL, {
        method: "POST",
        headers: await bearerHeaders(),
      });
      const challengeBody = await challengeResponse.json() as Partial<SigningChallenge> & { message?: string };
      if (
        !challengeResponse.ok
        || !challengeBody.challengeId
        || !challengeBody.hash
        || challengeBody.purpose !== SIGNING_PURPOSE
        || typeof challengeBody.expiresAt !== "number"
      ) {
        throw new Error(challengeBody.message || "signing challenge unavailable");
      }
      activeChallenge = challengeBody as SigningChallenge;
      const proofSigner = new PrivySigner(signerConfig);
      await proofSigner.signRaw(activeChallenge.hash);

      await starkzapWalletRef.current?.disconnect();
      starkzapWalletRef.current = onboard.wallet;
      const accountAddress = String(onboard.wallet.address);
      setWallet({ ...privyWallet, accountAddress, deployed: onboard.deployed });
      setStatus(onboard.deployed ? "STARKZAP SIGNER VERIFIED. ACCOUNT DEPLOYED." : "STARKZAP SIGNER VERIFIED. ACCOUNT NOT DEPLOYED.");
    } catch (error) {
      setWallet(null);
      setStatus(errorStatus(error));
    } finally {
      setCreating(false);
    }
  }

  async function signOut() {
    await starkzapWalletRef.current?.disconnect();
    starkzapWalletRef.current = null;
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
            <span>PRIVY / STARKZAP</span>
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
              {!wallet && <button onClick={createAccount} disabled={creating}>{creating ? "CONNECTING…" : "CONNECT STARKNET ACCOUNT"}</button>}
              {wallet && <strong title={wallet.accountAddress}>{shortAddress(wallet.accountAddress)}</strong>}
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
