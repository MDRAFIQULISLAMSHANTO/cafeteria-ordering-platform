import type { MetadataRoute } from "next";

// Installable on a phone's home screen, so ordering feels like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STS Group — Online Cafeteria Ordering",
    short_name: "Cafeteria",
    start_url: "/order",
    display: "standalone",
    background_color: "#FEF0E5",
    theme_color: "#462576",
    icons: [{ src: "/branding/sts-group-logo.png", sizes: "239x103", type: "image/png" }],
  };
}
