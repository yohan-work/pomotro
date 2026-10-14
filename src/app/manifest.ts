import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "METRO — 서울을 달리는 뽀모도로",
    short_name: "METRO",
    description: "집중하는 동안, 서울 지하철 창가에 앉아 한 구간을 함께 달려요.",
    start_url: "/",
    display: "standalone",
    background_color: "#F7F5F1",
    theme_color: "#2E946B",
    lang: "ko",
    categories: ["productivity", "lifestyle"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
