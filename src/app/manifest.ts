import type { MetadataRoute } from "next";

// Installable on a phone's home screen, so ordering feels like an app.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "STS Café — Online Ordering",
    short_name: "STS Café",
    start_url: "/order",
    display: "standalone",
    background_color: "#EBE5EA",
    theme_color: "#7F4F74",
    icons: [{ src: "/branding/sts-group-logo.png", sizes: "239x103", type: "image/png" }],
  };
}
