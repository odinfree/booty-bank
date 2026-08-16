import MainnetRouteState from "../../../components/mainnet-route-state";

export default function SettingsPage() {
  return <MainnetRouteState index="08" eyebrow="SETTINGS" title="ACCOUNT CONTROL." description="MANAGE THE CONNECTED WALLET, MAINNET SESSION, EXPLORER LINKS, DISPLAY PRIVACY, AND PRODUCT AVAILABILITY FROM ONE PLACE." status="SHELL LIVE" actions={[{ href: "/app/settings/security/", label: "SECURITY" }]} />;
}
