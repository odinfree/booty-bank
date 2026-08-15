"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useCallback, useEffect, useRef, useState } from "react";

const WALLET_API_ORIGIN = process.env.NEXT_PUBLIC_WALLET_API_URL ?? "";
const PREFERRED_NETWORK = process.env.NEXT_PUBLIC_STARKNET_NETWORK === "sepolia" ? "sepolia" : "mainnet";

type NetworkName = "mainnet" | "sepolia";

function shortAddress(address: string) {
  return address.length > 16 ? `${address.slice(0, 7)}…${address.slice(-5)}` : address;
}

function voyagerAddressUrl(network: NetworkName, address: string) {
  const host = network === "sepolia" ? "https://sepolia.voyager.online" : "https://voyager.online";
  return `${host}/contract/${address}`;
}

export default function PrivyStarknetWallet() {
  const { ready, authenticated, login, logout, getAccessToken } = usePrivy();
  const [session, setSession] = useState<{ address: string; balance: string; deployed: boolean; network: NetworkName } | null>(null);
  const [status, setStatus] = useState("");
  const connectingRef = useRef(false);

  const connectPrivy = useCallback(async () => {
    if (connectingRef.current || !authenticated) return;
    connectingRef.current = true;
    setStatus("PRIVY / CONNECTING…");
    try {
      const token = await getAccessToken();
      if (!token) throw new Error("PRIVY SESSION EXPIRED.");
      const response = await fetch(`${WALLET_API_ORIGIN}/api/wallet/starknet`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: "{}",
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message ?? "PRIVY WALLET FAILED.");

      const { StarkZap, OnboardStrategy, accountPresets, getPresets } = await import("starkzap");
      const sdk = new StarkZap({ network: PREFERRED_NETWORK });
      const signUrl = new URL(`${WALLET_API_ORIGIN}/api/wallet/sign`, window.location.origin).toString();
      const result = await sdk.onboard({
        strategy: OnboardStrategy.Privy,
        deploy: "never",
        accountPreset: accountPresets.argentXV050,
        privy: {
          resolve: async () => ({
            walletId: data.walletId,
            publicKey: data.publicKey,
            serverUrl: signUrl,
            headers: async () => {
              const currentToken = await getAccessToken();
              if (!currentToken) throw new Error("PRIVY SESSION EXPIRED.");
              return { Authorization: `Bearer ${currentToken}` };
            },
          }),
        },
      });
      const chainId = result.wallet.getChainId();
      const balance = await result.wallet.balanceOf(getPresets(chainId).STRK);
      setSession({
        address: result.wallet.address,
        balance: balance.toFormatted(true),
        deployed: result.deployed,
        network: chainId.isSepolia() ? "sepolia" : "mainnet",
      });
      setStatus("");
    } catch (error) {
      setStatus(error instanceof Error ? error.message.toUpperCase().slice(0, 90) : "PRIVY WALLET FAILED.");
    } finally {
      connectingRef.current = false;
    }
  }, [authenticated, getAccessToken]);

  useEffect(() => {
    if (ready && authenticated && !session) void connectPrivy();
  }, [ready, authenticated, session, connectPrivy]);

  if (session) {
    return (
      <div className="wallet-session privy-session">
        <a className="wallet-session-main" href={voyagerAddressUrl(session.network, session.address)} target="_blank" rel="noreferrer">
          <span>PRIVY / {session.deployed ? "LIVE" : "PREFUND"}</span>
          <b>{shortAddress(session.address)}</b>
          <strong>{session.balance}</strong>
        </a>
        <button onClick={async () => { await logout(); setSession(null); }} aria-label="Log out of Privy">×</button>
      </div>
    );
  }

  return (
    <div className="wallet-connect-block">
      <button className="wallet-connect-button privy-button" onClick={() => authenticated ? void connectPrivy() : login()} disabled={!ready}>
        <span className="privy-label-wide">SOCIAL LOGIN</span>
        <span className="privy-label-short">LOGIN</span>
      </button>
      {status && <span className="wallet-inline-error" role="status">{status}</span>}
    </div>
  );
}
