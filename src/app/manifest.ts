import type { MetadataRoute } from "next";

/** Bump after regenerating icons (npm run icons) so browsers drop the old ones. */
const ICONS_VERSION = 2;

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "Aterriza",
    short_name: "Aterriza",
    description: "Guía para estudiantes colombianos que llegan a Piura, Perú",
    lang: "es",
    dir: "ltr",
    start_url: "/inicio",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    // Brand palette (src/app/globals.css): cream background, navy theme.
    background_color: "#FCF8EC",
    theme_color: "#00105B",
    categories: ["education", "travel", "utilities"],
    icons: [
      { src: `/icons/icon-192.png?v=${ICONS_VERSION}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `/icons/icon-512.png?v=${ICONS_VERSION}`, sizes: "512x512", type: "image/png", purpose: "any" },
      { src: `/icons/icon-maskable-512.png?v=${ICONS_VERSION}`, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
