import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cache Components (and Partial Prefetching) stay off: every page reads the
  // Supabase session per request, and prerendering those reads broke production
  // (Date.now() / fetch() rejected during prerender). Nothing here uses "use cache".
  async headers() {
    return [
      {
        // Always revalidate the service worker so updates reach users quickly.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
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
