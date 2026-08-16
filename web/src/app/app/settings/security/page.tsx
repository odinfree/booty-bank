import MainnetRouteState from "../../../../components/mainnet-route-state";

export default function SecurityPage() {
  return <MainnetRouteState index="08" eyebrow="SECURITY" title="KEYS STAY YOURS." description="THE CONNECTED WALLET APPROVES EVERY LIVE ACTION. PRIVY AND FALCON ACCOUNT CONTROLS REMAIN UNAVAILABLE UNTIL DEPLOYMENT, SIGNING, RECOVERY, AND POLICY TESTS PASS END TO END." status="SELF-CUSTODY" actions={[{ href: "/app/settings/", label: "SETTINGS" }]} />;
}
