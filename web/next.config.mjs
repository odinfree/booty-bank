const isPages = process.env.GITHUB_ACTIONS === "true";
const repo = "booty-bank";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true,
  images: { unoptimized: true },
  basePath: isPages ? `/${repo}` : "",
  assetPrefix: isPages ? `/${repo}/` : "",
};

export default nextConfig;
