const MAINNET_EXPLORER = "https://starkscan.co";
const SEPOLIA_EXPLORER = "https://sepolia.voyager.online";

function explorerHost(network) {
  if (network === "mainnet") return MAINNET_EXPLORER;
  if (network === "sepolia") return SEPOLIA_EXPLORER;
  throw new Error("UNSUPPORTED STARKNET NETWORK.");
}

export function explorerAddressUrl(network, address) {
  return `${explorerHost(network)}/contract/${address}`;
}

export function explorerTransactionUrl(network, transactionHash) {
  return `${explorerHost(network)}/tx/${transactionHash}`;
}

export function explorerName(network) {
  if (network === "mainnet") return "STARKSCAN";
  if (network === "sepolia") return "VOYAGER";
  throw new Error("UNSUPPORTED STARKNET NETWORK.");
}
