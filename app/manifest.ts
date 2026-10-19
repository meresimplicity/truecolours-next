import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/admin/",
    name: "TRUECOLOURS Business Dashboard",
    short_name: "TRUECOLOURS POS",
    description:
      "TRUECOLOURS automotive and industrial paint catalogue and business workspace.",
    start_url: "/admin/dashboard",
    scope: "/admin/",
    display: "standalone",
    orientation: "any",
    background_color: "#f5f6f7",
    theme_color: "#0f172a",
    lang: "en-ZA",
    categories: ["business", "shopping", "productivity"],
    icons: [
      {
        src: "/pwa-icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa-icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Business dashboard",
        short_name: "Dashboard",
        description: "Open the protected TRUECOLOURS administration dashboard.",
        url: "/admin/dashboard",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
      {
        name: "Inventory",
        short_name: "Inventory",
        description: "Open cached stock and inventory controls.",
        url: "/admin/inventory",
        icons: [{ src: "/pwa-icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
  };
}
