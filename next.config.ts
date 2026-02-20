import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["firebase-admin", "@react-pdf/renderer"],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
    esmExternals: "loose"
  },
  webpack: (config, { isServer }) => {
    // @react-pdf/renderer is server-side only; exclude it from the client bundle
    if (!isServer) {
      config.externals.push("@react-pdf/renderer");
    }

    // Handle canvas for PDF generation
    config.externals = [...config.externals, { canvas: "canvas" }];
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    };

    return config;
  },
};

export default nextConfig;
