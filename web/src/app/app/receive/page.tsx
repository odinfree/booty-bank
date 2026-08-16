"use client";

import { useState } from "react";
import { useMainnetAccount } from "../../../components/mainnet-account-context";
import MainnetRouteState from "../../../components/mainnet-route-state";

export default function ReceivePage() {
  const { session } = useMainnetAccount();
  const [copied, setCopied] = useState(false);
  async function copyAddress() {
    if (!session) return;
    await navigator.clipboard.writeText(session.address);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }
  return <MainnetRouteState index="03" eyebrow="MOVE" title="RECEIVE ON MAINNET." description="USE ONLY ON STARKNET MAINNET. VERIFY THE FULL ADDRESS BEFORE SENDING A LARGE AMOUNT." status={session ? "ADDRESS LIVE" : "WALLET REQUIRED"} actions={[{ href: "/app/send/", label: "SEND" }, { href: "/app/assets/", label: "ASSETS" }]}>
    {session && <section className="mainnet-receive-card"><span>YOUR STARKNET MAINNET ADDRESS</span><b>{session.address}</b><div><button onClick={copyAddress}>{copied ? "COPIED ✓" : "COPY ADDRESS"}</button><a href={`https://starkscan.co/contract/${session.address}`} target="_blank" rel="noreferrer">VERIFY ON STARKSCAN ↗</a></div></section>}
  </MainnetRouteState>;
}
