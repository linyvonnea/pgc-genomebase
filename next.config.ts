import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ["firebase-admin"],
  experimental: {
    esmExternals: "loose"
  },
  webpack: (config, { isServer }) => {
    // Handle @react-pdf/renderer ESM package
    if (!isServer) {
      config.externals.push({
        "@react-pdf/renderer": "@react-pdf/renderer"
      });
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
