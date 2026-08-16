"use client";

import Link from "next/link";
import { useMainnetAccount } from "../../components/mainnet-account-context";

export default function AccountPage() {
  const { session } = useMainnetAccount();
  return (
    <div className="mainnet-overview">
      <header className="mainnet-route-head mainnet-overview-head">
        <div><span>01 / SELF-CUSTODIAL ACCOUNT</span><h1>YOUR MONEY.<br />ON MAINNET.</h1></div>
        <b>{session ? "MAINNET LIVE" : "CONNECT TO LOAD"}</b>
      </header>

      {session ? <section className="mainnet-account-live">
        <div className="mainnet-live-identity"><span>CONNECTED ACCOUNT</span><b>{session.address}</b><small>{session.walletName} / REFRESHED {new Date(session.refreshedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small></div>
        <div className="mainnet-live-assets">{session.assets.map((asset) => <article key={asset.symbol}><span>{asset.symbol}</span><strong>{asset.amount ?? "BALANCE UNAVAILABLE"}</strong><small>STARKNET MAINNET</small></article>)}</div>
      </section> : <section className="mainnet-connect-state">
        <div><span>NO SAMPLE BALANCE</span><h2>CONNECT YOUR STARKNET WALLET.</h2></div>
        <p>BOOTY BANK LOADS REAL STRK AND USDC FROM THE EXACT MAINNET ACCOUNT YOU APPROVE. NOTHING IS INVENTED BEFORE CONNECTION.</p>
        <strong>CONNECT IN THE TOP BAR ↑</strong>
      </section>}

      <div className="mainnet-action-grid">
        <Link href="/app/receive/"><i>01</i><span>RECEIVE</span><b>YOUR MAINNET ADDRESS</b><strong>↗</strong></Link>
        <Link href="/app/send/"><i>02</i><span>SEND</span><b>REVIEWED TRANSFER</b><strong>↗</strong></Link>
        <Link href="/app/swap/"><i>03</i><span>SWAP</span><b>AVNU / STRK TO USDC</b><strong>↗</strong></Link>
      </div>

      <section className="mainnet-capabilities">
        <div className="mainnet-section-head"><span>PRODUCT STATUS</span><b>MAINNET FIRST</b></div>
        <div><i>01</i><b>WALLET + BALANCES</b><span>LIVE RAIL</span><strong>{session ? "CONNECTED" : "CONNECT"}</strong></div>
        <div><i>02</i><b>AVNU SWAP</b><span>USER-PAID GAS</span><strong>LIVE</strong></div>
        <div><i>03</i><b>STRK20 PRIVACY</b><span>SUPPORTED WALLETS</span><strong>LIVE RAIL</strong></div>
        <div><i>04</i><b>CARDS + PAYOUTS + CREDIT</b><span>REGULATED PROVIDERS</span><strong>PARTNER</strong></div>
      </section>
    </div>
  );
}
