import type { Metadata } from "next";
import Image from "next/image";
import { Logo } from "@/components/Logo";
import qr from "../../../public/qr-aterriza.png";

export const metadata: Metadata = { title: "Código QR · Aterriza" };

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";
const siteHost = siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, "");

/** Large QR to project in class. Regenerate the image with `npm run qr`. */
export default function QrPage() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col items-center justify-center gap-6 px-4 py-8 text-center">
      <div className="flex items-center gap-3">
        <Logo size={64} title="" />
        <h1 className="text-4xl font-extrabold tracking-tight text-heading sm:text-5xl">
          Aterriza
        </h1>
      </div>
      <p className="text-xl font-bold text-muted sm:text-2xl">
        Escanea con la cámara de tu celular
      </p>

      {/* White frame keeps the QR readable in dark mode too. */}
      <div className="relative w-full max-w-[min(100%,70vh)] rounded-3xl bg-white p-4 shadow-lg">
        <Image
          src={qr}
          alt={`Código QR que abre ${siteHost || "Aterriza"}`}
          priority
          sizes="(max-width: 768px) 100vw, 70vh"
          className="h-auto w-full"
        />
        <span className="absolute left-1/2 top-1/2 flex size-[22%] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white p-[1.5%]">
          <Logo size={256} title="" className="size-full" />
        </span>
      </div>

      {siteHost && (
        <p className="break-all text-2xl font-extrabold text-heading sm:text-3xl">
          {siteHost}
        </p>
      )}
    </main>
  );
}
