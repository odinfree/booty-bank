"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import StarknetWalletControl from "./starknet-wallet-control";

const primary = [
  { href: "/app/", label: "OVERVIEW", mark: "01" },
  { href: "/app/assets/", label: "ASSETS", mark: "02" },
  { href: "/app/send/", label: "MOVE", mark: "03", routes: ["/app/send/", "/app/receive/", "/app/swap/"] },
  { href: "/app/privacy/", label: "PRIVACY", mark: "04" },
];

const partner = [
  { href: "/app/cards/", label: "CARDS" },
  { href: "/app/payouts/", label: "PAYOUTS" },
  { href: "/app/credit/", label: "CREDIT" },
  { href: "/app/settings/", label: "SETTINGS" },
];

function routeActive(pathname: string, item: { href: string; routes?: string[] }) {
  if (item.routes) return item.routes.some((route) => pathname.startsWith(route));
  return item.href === "/app/" ? pathname === "/app" || pathname === "/app/" : pathname.startsWith(item.href);
}

export default function MainnetAppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <main className="mainnet-app">
      <header className="mainnet-topbar">
        <Link className="mainnet-brand" href="/" aria-label="Booty Bank home">
          <img src="/brand/bootybank-mark-cream.svg" alt="" width="40" height="40" />
          <span>BOOTY BANK</span>
        </Link>
        <div className="mainnet-network" aria-label="Required network"><span>NETWORK</span><b>STARKNET MAINNET</b></div>
        <div className="mainnet-wallet"><StarknetWalletControl /></div>
        <Link className="mainnet-exit" href="/">EXIT APP ×</Link>
      </header>

      <div className="mainnet-frame">
        <aside className="mainnet-sidebar">
          <nav aria-label="Mainnet account navigation">
            {primary.map((item) => (
              <Link key={item.href} href={item.href} className={routeActive(pathname, item) ? "active" : ""}>
                <i>{item.mark}</i><span>{item.label}</span>
              </Link>
            ))}
          </nav>
          <div className="mainnet-partner-nav">
            <span>PARTNER PRODUCTS</span>
            {partner.map((item) => <Link key={item.href} href={item.href} className={routeActive(pathname, item) ? "active" : ""}>{item.label}<i>↗</i></Link>)}
          </div>
          <div className="mainnet-truth"><span>ACCOUNT MODEL</span><b>SELF-CUSTODIAL</b><small>EVERY LIVE AMOUNT COMES FROM YOUR CONNECTED WALLET.</small></div>
        </aside>

        <section className="mainnet-content">{children}</section>
      </div>

      <nav className="mainnet-mobile-nav" aria-label="Mobile account navigation">
        {primary.map((item) => (
          <Link key={item.href} href={item.href} className={routeActive(pathname, item) ? "active" : ""}>
            <i>{item.mark}</i><span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
