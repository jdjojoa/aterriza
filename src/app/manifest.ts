import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aterriza",
    short_name: "Aterriza",
    description: "Guía para estudiantes colombianos que llegan a Piura, Perú",
    lang: "es",
    start_url: "/",
    display: "standalone",
    background_color: "#F5FBE3",
    theme_color: "#B5D275",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
