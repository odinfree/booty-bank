"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

export default function AppProviders({ children }: { children: ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const clientId = process.env.NEXT_PUBLIC_PRIVY_CLIENT_ID;

  if (appId) {
    return (
      <PrivyProvider
        appId={appId}
        clientId={clientId || undefined}
        config={{ loginMethods: ["google", "email"] }}
      >
        {children}
      </PrivyProvider>
    );
  }

  return children;
}
