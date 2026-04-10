import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: [
    "@shecancode/block-engine",
    "@shecancode/lesson-engine",
    "@shecancode/shared-types",
    "@shecancode/ui",
    "@shecancode/voice-parser",
  ],
};

export default nextConfig;
