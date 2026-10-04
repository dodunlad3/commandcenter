import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Allow the loopback address used by the desktop preview, alongside localhost.
  allowedDevOrigins: ["127.0.0.1"],
};
export default nextConfig;
