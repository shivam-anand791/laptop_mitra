import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@laptopmitra/types", "@laptopmitra/api-client"],
};

export default nextConfig;
