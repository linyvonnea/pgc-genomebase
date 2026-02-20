import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["firebase-admin", "@react-pdf/renderer"],
  webpack: (config, { isServer }) => {
    // Mark external packages for server-side only
    if (!isServer) {
      config.externals = [...(config.externals || []), "@react-pdf/renderer", "canvas"];
    }

    return config;
  },
};

export default nextConfig;
