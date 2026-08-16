export const AVNU_MAINNET_CHAIN_ID = "0x534e5f4d41494e";
export const AVNU_MAINNET_EXCHANGE = "0x04270219d365d6b017231b52e92b3fb5d7c8378b05e9abc97724537a80e93b0f";

function felt(value) {
  try {
    return BigInt(value).toString(16);
  } catch {
    throw new Error("AVNU RETURNED AN INVALID FELT.");
  }
}

function uint256(calldata, offset) {
  return BigInt(calldata[offset]) + (BigInt(calldata[offset + 1]) << 128n);
}

function sameFelt(left, right) {
  return felt(left) === felt(right);
}

export function validateAvnuSwapCalls({ built, quote, takerAddress, slippage }) {
  if (!Number.isFinite(slippage) || slippage <= 0 || slippage > 0.03) {
    throw new Error("SLIPPAGE POLICY REJECTED.");
  }
  if (!sameFelt(built.chainId, AVNU_MAINNET_CHAIN_ID) || !sameFelt(quote.chainId, AVNU_MAINNET_CHAIN_ID)) {
    throw new Error("AVNU EXECUTION IS MAINNET ONLY.");
  }
  if (!Array.isArray(built.calls) || built.calls.length !== 2) {
    throw new Error("AVNU CALL COUNT REJECTED.");
  }
  const [approve, swap] = built.calls;
  const approveCalldata = [...(approve.calldata ?? [])];
  const swapCalldata = [...(swap.calldata ?? [])];
  if (
    approve.entrypoint !== "approve"
    || !sameFelt(approve.contractAddress, quote.sellTokenAddress)
    || approveCalldata.length !== 3
    || !sameFelt(approveCalldata[0], AVNU_MAINNET_EXCHANGE)
    || uint256(approveCalldata, 1) !== BigInt(quote.sellAmount)
  ) {
    throw new Error("AVNU APPROVAL POLICY REJECTED.");
  }
  if (
    swap.entrypoint !== "multi_route_swap"
    || !sameFelt(swap.contractAddress, AVNU_MAINNET_EXCHANGE)
    || swapCalldata.length < 12
    || swapCalldata.length > 512
    || !sameFelt(swapCalldata[0], quote.sellTokenAddress)
    || uint256(swapCalldata, 1) !== BigInt(quote.sellAmount)
    || !sameFelt(swapCalldata[3], quote.buyTokenAddress)
    || !sameFelt(swapCalldata[8], takerAddress)
    || BigInt(swapCalldata[9]) !== 0n
    || BigInt(swapCalldata[10]) !== 0n
  ) {
    throw new Error("AVNU SWAP POLICY REJECTED.");
  }
  const minimumOutput = BigInt(quote.buyAmount) * BigInt(Math.floor((1 - slippage) * 10_000)) / 10_000n;
  if (uint256(swapCalldata, 6) < minimumOutput) {
    throw new Error("AVNU MINIMUM OUTPUT REJECTED.");
  }
  if (
    Number.isFinite(quote.sellAmountInUsd)
    && Number.isFinite(quote.buyAmountInUsd)
    && quote.sellAmountInUsd > 0
    && Math.abs(quote.buyAmountInUsd / quote.sellAmountInUsd - 1) > 0.05
  ) {
    throw new Error("AVNU VALUE DEVIATION REJECTED.");
  }
  return built.calls;
}
