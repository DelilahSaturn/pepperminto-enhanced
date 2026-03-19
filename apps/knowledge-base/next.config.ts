import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const apiUrl = process.env.API_URL || "http://127.0.0.1:3001";
    return {
      beforeFiles: [
        {
          source: "/api/v1/:path*",
          destination: `${apiUrl}/api/v1/:path*`,
          basePath: false,
        },
      ],
    };
  },
};

export default nextConfig;
