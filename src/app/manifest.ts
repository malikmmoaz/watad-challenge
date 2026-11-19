import type { MetadataRoute } from "next";
import { meta, SITE_EN } from "@/i18n/meta";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_EN,
    short_name: "Watad demo",
    description: meta.en.home.description,
    start_url: "/",
    display: "standalone",
    background_color: "#f6faf7",
    theme_color: "#021c11",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
