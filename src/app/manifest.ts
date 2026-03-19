import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PGC Visayas Client Portal",
    short_name: "PGC Portal",
    description: "Client portal for inquiries, project updates, and chat with PGC Visayas.",
    start_url: "/portal",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f8fafc",
    theme_color: "#166FB5",
    icons: [
      {
        src: "/assets/pgc-logo.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/assets/pgc-logo.png",
        sizes: "512x512",
        type: "image/png",
      },
      {
        src: "/assets/pgc-logo.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
