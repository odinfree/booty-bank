"use client";

import { useMainnetAccount } from "../../../components/mainnet-account-context";
import MainnetRouteState from "../../../components/mainnet-route-state";

export default function AssetsPage() {
  const { session } = useMainnetAccount();
  return <MainnetRouteState index="02" eyebrow="ASSETS" title="REAL BALANCES." description="STRK AND USDC LOAD DIRECTLY FROM THE CONNECTED STARKNET MAINNET ACCOUNT. NO SAMPLE VALUES. NO HIDDEN FIAT CONVERSION." status={session ? "MAINNET LIVE" : "WALLET REQUIRED"} actions={[{ href: "/app/receive/", label: "RECEIVE" }, { href: "/app/swap/", label: "SWAP" }]}>
    {session && <section className="mainnet-asset-list"><div className="mainnet-section-head"><span>ASSET</span><b>ONCHAIN BALANCE</b></div>{session.assets.map((asset) => <article key={asset.symbol}><i>{asset.symbol.slice(0, 1)}</i><div><b>{asset.symbol}</b><small>{asset.address}</small></div><strong>{asset.amount ?? "UNAVAILABLE"}</strong></article>)}</section>}
  </MainnetRouteState>;
}
