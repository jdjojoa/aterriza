import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Transporte · Aterriza" };

export default function TransportPage() {
  return <ComingSoon href="/transporte" />;
}
