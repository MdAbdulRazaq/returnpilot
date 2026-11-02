import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Shopify OAuth/HMAC and token encryption rely on Node's crypto module,
  // so every route defaults to the Node.js runtime (never Edge).
  serverExternalPackages: [],
};

export default nextConfig;
