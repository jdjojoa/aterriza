import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Términos de uso · Aterriza",
  description: "Condiciones para usar Aterriza.",
};

export default function TermsPage() {
  return <LegalPage name="terminos" />;
}
