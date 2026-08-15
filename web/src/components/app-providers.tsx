"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
const PrivyProviderShell = dynamic(() => import("./privy-provider-shell"), { ssr: false });

export default function AppProviders({ children }: { children: ReactNode }) {
  if (!PRIVY_APP_ID) return children;
  return <PrivyProviderShell appId={PRIVY_APP_ID}>{children}</PrivyProviderShell>;
}
