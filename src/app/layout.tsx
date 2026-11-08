import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import { ThemeToggle } from "@/components/ThemeToggle";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aterriza",
  description: "Guía para estudiantes colombianos que llegan a Piura, Perú",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F5FBE3" },
    { media: "(prefers-color-scheme: dark)", color: "#0E1F38" },
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
      <body className="flex min-h-full flex-col font-sans">
        <header className="flex justify-end px-4 pt-4">
          <ThemeToggle />
        </header>
        {children}
      </body>
    </html>
  );
}
