import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [{
      source: "/order/:path*",
      headers: [
        { key: "Cache-Control", value: "no-store" },
        { key: "Referrer-Policy", value: "no-referrer" },
      ],
    }, {
      source: "/owner/:path*",
      headers: [
        { key: "X-Robots-Tag", value: "noindex" },
        { key: "Cache-Control", value: "no-store" },
      ],
    }];
  },
  ...(process.env.NEXT_OUTPUT === "standalone" ? { output: "standalone" } : {}),
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
