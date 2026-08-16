import MainnetRouteState from "../../../components/mainnet-route-state";

export default function AssetsPage() {
  return <MainnetRouteState index="02" eyebrow="ASSETS" title="REAL BALANCES." description="CONNECT A MAINNET WALLET TO LOAD STRK AND USDC DIRECTLY FROM STARKNET. BALANCES, VALUES, AND REFRESH TIMES WILL NEVER USE SAMPLE DATA." status="WALLET REQUIRED" actions={[{ href: "/app/receive/", label: "RECEIVE" }, { href: "/app/swap/", label: "SWAP" }]} />;
}
