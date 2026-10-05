import type { NextConfig } from "next";
import * as path from "path";

const defaultImageHosts = [
  "images.unsplash.com",
  "via.placeholder.com",
];

const envImageHosts = process.env.NEXT_PUBLIC_IMAGE_HOSTS
  ? process.env.NEXT_PUBLIC_IMAGE_HOSTS.split(",").map((h) => h.trim()).filter(Boolean)
  : defaultImageHosts;

const nextConfig: NextConfig = {
  // Allow images only from explicit allow-list
  images: {
    remotePatterns: envImageHosts.map((hostname) => ({
      protocol: "https" as const,
      hostname,
    })),
  },
  // Turborepo integration
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
