"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import type { ReactNode } from "react";

export default function PrivyProviderShell({ appId, children }: { appId: string; children: ReactNode }) {
  return (
    <PrivyProvider
      appId={appId}
      config={{
        loginMethods: ["email", "google"],
        appearance: {
          theme: "dark",
          accentColor: "#f63c35",
          logo: "https://bootybank.app/og-image.png",
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
