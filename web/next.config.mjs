/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true,
  images: { unoptimized: true },
  webpack(config) {
    // Starkzap's barrel references optional cross-chain bridge peers. Booty Bank's
    // shipped rail is Starknet-only, so keep unused Solana/Hyperlane transports out.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@hyperlane-xyz/registry": false,
      "@hyperlane-xyz/sdk": false,
      "@hyperlane-xyz/utils": false,
      "@solana/web3.js": false,
      "@cartridge/controller": false,
      "@farcaster/mini-app-solana": false,
    };
    // Privy's optional x402 client reaches Viem's Tempo virtual master pool,
    // whose runtime-only dynamic import triggers Webpack's static warning.
    // Booty Bank does not invoke that branch; keep every other warning visible.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /virtualMasterPool\.js$/, message: /Critical dependency/ },
    ];
    return config;
  },
};

export default nextConfig;
