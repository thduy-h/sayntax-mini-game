import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Slightly above the 10 MiB ASR file cap so the route can return 413
    // after accounting for multipart framing instead of receiving a truncated body.
    proxyClientMaxBodySize: "11mb",
  },
  async headers() {
    return [{ source: "/:path*", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Permissions-Policy", value: "microphone=(self), camera=(), geolocation=()" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
  transpilePackages: [
    "@shecancode/block-engine",
    "@shecancode/lesson-engine",
    "@shecancode/shared-types",
    "@shecancode/ui",
    "@shecancode/voice-parser",
  ],
};

export default nextConfig;
