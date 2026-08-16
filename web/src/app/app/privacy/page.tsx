import MainnetRouteState from "../../../components/mainnet-route-state";

export default function AppPrivacyPage() {
  return <MainnetRouteState index="04" eyebrow="PRIVACY" title="PRIVATE MONEY." description="STRK20 BALANCES, SHIELDING, PRIVATE SEND, AND UNSHIELDING STAY INSIDE A SUPPORTED WALLET. BOOTY BANK NEVER RECEIVES YOUR VIEWING KEY." status="WALLET CAPABILITY" actions={[{ href: "/privacy/", label: "PRIVACY MODEL" }]} />;
}
