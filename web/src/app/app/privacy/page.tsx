"use client";

import MainnetRouteState from "../../../components/mainnet-route-state";

export default function AppPrivacyPage() {
  return <MainnetRouteState index="04" eyebrow="PRIVACY" title="PRIVATE MONEY." description="SHIELD STRK, USDC, ETH, OR WBTC. SEND INSIDE THE POOL. UNSHIELD WHEN YOU WANT TRANSPARENCY. YOUR WALLET KEEPS THE VIEWING KEY." status="STRK20 WALLET API" actions={[{ href: "/privacy/", label: "PRIVACY MODEL" }]}>
    <section className="mainnet-privacy-launch"><span>LIVE POOL ACTIONS</span><h2>SHIELD. SEND. UNSHIELD.</h2><p>READY WALLET API 0.10.3 OR NEWER. EVERY CONFIRMATION HAPPENS IN THE READY WALLET PANEL. PROVING TAKES A MOMENT.</p><button onClick={() => window.dispatchEvent(new Event("bootybank:open-strk20"))}>OPEN STRK20 CONTROLS ↗</button></section>
  </MainnetRouteState>;
}
