import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse pulls in pdfjs-dist, which sets up a "fake worker" (its
  // Node-main-thread fallback) by dynamically importing its own worker
  // file at runtime. Bundling it rewrites that import path and breaks it —
  // opting the package out of bundling makes it use plain Node `require`
  // instead, which resolves node_modules normally.
  serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
};

export default nextConfig;
