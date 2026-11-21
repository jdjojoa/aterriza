import type { MetadataRoute } from "next";

/**
 * Public pages are the landing, /qr and /offline. Everything else needs a
 * session (src/proxy.ts redirects to /), and the API and admin are never
 * useful to crawlers. No sitemap yet: the public surface is a single page.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/api/",
        "/auth/",
        "/onboarding",
        "/inicio",
        "/perfil",
        "/chat",
        "/identificar",
        "/transporte",
        "/lugares",
        "/moneda",
        "/jerga",
        "/costumbres",
        "/aportes",
      ],
    },
  };
}
