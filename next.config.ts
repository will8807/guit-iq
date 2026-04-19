import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow mobile devices on the local network to access the dev server.
  // Next.js 16 blocks cross-origin dev resources by default.
  allowedDevOrigins: ["192.168.1.81"],
};

export default nextConfig;
