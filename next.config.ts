import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["tesseract.js", "sharp"],
  // The source repositories are raw import inputs, not application code. Keep
  // the small runtime catalogue available to the vehicle APIs, while avoiding
  // tracing 200+ MB of raw source/database files for every production build.
  outputFileTracingIncludes: {
    "/api/vehicles/**": ["./data/processed/vehicle-selector.json"],
    "/api/paint/history": ["./data/processed/historical-paint-library.json", "./data/processed/historical-paint-samples.json"],
    "/api/paint/history/samples": ["./data/processed/historical-paint-library.json", "./data/processed/historical-paint-samples.json", "./node_modules/@tesseract.js-data/eng/4.0.0_best_int/**", "./node_modules/tesseract.js/src/worker-script/**", "./node_modules/tesseract.js-core/**"],
    "/api/paint/search": ["./data/processed/historical-paint-library.json"],
  },
  outputFileTracingExcludes: {
    "/*": [
      "./open-vehicle-db-master/**",
      "./vehicle-db-main/**",
      "./data/vehicles.db",
    ],
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "files.manuscdn.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "d2xsxph8kpxj0f.cloudfront.net",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
    formats: ["image/avif", "image/webp"],
    deviceSizes: [360, 414, 640, 768, 1024, 1280],
    imageSizes: [128, 256, 384, 512],
    minimumCacheTTL: 60 * 60 * 24 * 30,
  },
};

export default nextConfig;
