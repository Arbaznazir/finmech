import type { NextConfig } from "next";

const apiProxyTarget =
  process.env.API_PROXY_TARGET ||
  process.env.API_INTERNAL_URL ||
  (process.env.NODE_ENV === "development"
    ? "http://localhost:5001"
    : "http://host.docker.internal:5000");

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget.replace(/\/+$/, "")}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
