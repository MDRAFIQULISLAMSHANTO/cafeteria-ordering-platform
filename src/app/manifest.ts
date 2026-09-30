import type { MetadataRoute } from "next";

// Installable on a phone's home screen, so ordering feels like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "S Cafe — Online Cafeteria Ordering",
    short_name: "S Cafe",
    start_url: "/order",
    display: "standalone",
    background_color: "#FEF0E5",
    theme_color: "#462576",
    icons: [{ src: "/branding/scafe-logo.png", sizes: "480x247", type: "image/png" }],
  };
}
