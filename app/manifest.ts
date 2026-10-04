import type { MetadataRoute } from "next";
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Daywell — Personal command center",
    short_name: "Daywell",
    description: "Your day, with a little more clarity.",
    start_url: "/",
    display: "standalone",
    background_color: "#111715",
    theme_color: "#111715",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
    ],
  };
}
