import Link from "next/link";
import type { ReactNode } from "react";

type RouteAction = { href: string; label: string };

export default function MainnetRouteState({
  index,
  eyebrow,
  title,
  description,
  status,
  actions = [],
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description: string;
  status: string;
  actions?: RouteAction[];
  children?: ReactNode;
}) {
  return (
    <div className="mainnet-route">
      <header className="mainnet-route-head">
        <div><span>{index} / {eyebrow}</span><h1>{title}</h1></div>
        <b>{status}</b>
      </header>
      <p className="mainnet-route-copy">{description}</p>
      {children}
      {actions.length > 0 && <div className="mainnet-route-actions">{actions.map((action) => <Link key={action.href} href={action.href}>{action.label}<i>↗</i></Link>)}</div>}
    </div>
  );
}
