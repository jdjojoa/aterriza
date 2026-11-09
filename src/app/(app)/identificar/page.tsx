import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Identificar · Aterriza" };

export default function IdentifyPage() {
  return <ComingSoon href="/identificar" />;
}
