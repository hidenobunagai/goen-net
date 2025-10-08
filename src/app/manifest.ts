import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Goen Net",
    short_name: "Goen Net",
    description: "Private alumni dashboard for sharing updates and next-session planning.",
    start_url: "/",
    display: "standalone",
    background_color: "#0f172a",
    theme_color: "#0f172a",
    lang: "en",
    icons: [
      {
        src: "/app-icon.svg",
        type: "image/svg+xml",
        sizes: "any",
      },
      {
        src: "/favicon.ico",
        type: "image/x-icon",
        sizes: "32x32",
      },
    ],
  };
}
