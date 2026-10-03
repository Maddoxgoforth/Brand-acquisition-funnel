import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/free-course",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
