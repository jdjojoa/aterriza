import type { Metadata } from "next";
import { ComingSoon } from "@/components/ComingSoon";

export const metadata: Metadata = { title: "Lugares · Aterriza" };

export default function PlacesPage() {
  return <ComingSoon href="/lugares" />;
}
