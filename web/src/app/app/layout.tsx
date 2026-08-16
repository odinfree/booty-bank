import type { ReactNode } from "react";
import MainnetAppShell from "../../components/mainnet-app-shell";

export default function AccountLayout({ children }: { children: ReactNode }) {
  return <MainnetAppShell>{children}</MainnetAppShell>;
}
