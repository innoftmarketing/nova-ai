import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return ["/merci-fr", "/merci-ar", "/merci-autre"].map((source) => ({
      source,
      destination: "/merci",
      permanent: false,
    }));
  },
};

export default nextConfig;
