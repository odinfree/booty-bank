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
    return config;
  },
};

export default nextConfig;
