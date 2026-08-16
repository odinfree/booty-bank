import MainnetRouteState from "../../../components/mainnet-route-state";

export default function SwapPage() {
  return <MainnetRouteState index="03" eyebrow="MOVE" title="SWAP WITH AVNU." description="FRESH MAINNET QUOTES. EXACT STRK TO USDC CALL POLICY. USER-PAID GAS. EXECUTION WILL NEVER ACCEPT LESS THAN THE OUTPUT YOU APPROVED WITHOUT A NEW CONFIRMATION." status="CONSENT FIX NEXT" actions={[{ href: "/app/send/", label: "SEND" }, { href: "/app/assets/", label: "ASSETS" }]} />;
}
