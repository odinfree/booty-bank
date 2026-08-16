import MainnetRouteState from "../../../components/mainnet-route-state";

export default function ReceivePage() {
  return <MainnetRouteState index="03" eyebrow="MOVE" title="RECEIVE ON MAINNET." description="CONNECT YOUR WALLET TO REVEAL, COPY, AND VERIFY THE EXACT ACCOUNT ADDRESS. ALWAYS CONFIRM STARKNET MAINNET BEFORE SENDING FUNDS." status="WALLET REQUIRED" actions={[{ href: "/app/send/", label: "SEND" }, { href: "/app/assets/", label: "ASSETS" }]} />;
}
