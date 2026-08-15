/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export",
  outputFileTracingRoot: process.cwd(),
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
