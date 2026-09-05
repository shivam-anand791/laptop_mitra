import type { NextConfig } from "next";
import * as path from "path";

const nextConfig: NextConfig = {
  // Allow images from external sources (Cloudinary, S3, etc.)
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Turborepo integration
  outputFileTracingRoot: path.join(__dirname, "../.."),
};

export default nextConfig;
