export const CORE_TOKEN_REGISTRY = Object.freeze([
  Object.freeze({ symbol: "STRK", presetKey: "STRK", address: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d", decimals: 18 }),
  Object.freeze({ symbol: "USDC", presetKey: "USDC", address: "0x033068f6539f8e6e6b131e6b2b814e6c34a5224bc66947c47dab9dfee93b35fb", decimals: 6 }),
  Object.freeze({ symbol: "ETH", presetKey: "ETH", address: "0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7", decimals: 18 }),
  Object.freeze({ symbol: "WBTC", presetKey: "WBTC", address: "0x03fe2b97c1fd336e750087d68b9b867997fd64a2661ff3ca5a7c771641e8e7ac", decimals: 8 }),
]);

function addressKey(address) {
  try {
    return BigInt(address).toString(16);
  } catch {
    return String(address).toLowerCase();
  }
}

export function getCoreToken(symbol) {
  const token = CORE_TOKEN_REGISTRY.find((candidate) => candidate.symbol === symbol);
  if (!token) throw new Error("SUPPORTED TOKEN REQUIRED.");
  return token;
}

export function validateSwapPair(sellSymbol, buySymbol) {
  const sellToken = getCoreToken(sellSymbol);
  const buyToken = getCoreToken(buySymbol);
  if (addressKey(sellToken.address) === addressKey(buyToken.address)) {
    throw new Error("CHOOSE TWO DIFFERENT TOKENS.");
  }
  return [sellToken, buyToken];
}

export function assertStarkzapPreset(registryToken, preset) {
  if (!preset
    || addressKey(registryToken.address) !== addressKey(preset.address)
    || registryToken.decimals !== preset.decimals) {
    throw new Error(`${registryToken.symbol} PRESET DOES NOT MATCH THE PINNED MAINNET TOKEN.`);
  }
  return preset;
}
