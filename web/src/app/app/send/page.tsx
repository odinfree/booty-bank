import MainnetRouteState from "../../../components/mainnet-route-state";

export default function SendPage() {
  return <MainnetRouteState index="03" eyebrow="MOVE" title="SEND ON STARKNET." description="THE LIVE FLOW WILL VALIDATE THE TOKEN, ADDRESS, AMOUNT, BALANCE, FEE, AND SIMULATION BEFORE YOUR WALLET RECEIVES AN APPROVAL REQUEST." status="NEXT COMMIT" actions={[{ href: "/app/receive/", label: "RECEIVE" }, { href: "/app/swap/", label: "SWAP" }]} />;
}
