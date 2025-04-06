import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  async headers() {
    return [
      {
        source: "/(.*)", // This applies to all routes
        headers: [
          {
            key: "Permissions-Policy",
            value: "fullscreen=*; usb=none; payment=self https://printer-test-ten.vercel.app",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
