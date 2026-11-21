import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

export const metadata: Metadata = {
  // Absolute URLs for opengraph-image.png in link previews.
  metadataBase: siteUrl ? new URL(siteUrl) : undefined,
  title: "Aterriza",
  description: "Guía para estudiantes que llegan a Piura, desde otro país o desde otra ciudad del Perú",
  applicationName: "Aterriza",
  appleWebApp: { capable: true, title: "Aterriza", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FCF8EC" },
    { media: "(prefers-color-scheme: dark)", color: "#000A3D" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${nunito.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      {/* Browser extensions (e.g. ColorZilla's cz-shortcut-listen) add attributes to <body>. */}
      <body className="flex min-h-full flex-col font-sans" suppressHydrationWarning>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
