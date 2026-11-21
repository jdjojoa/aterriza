import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/LegalPage";

export const metadata: Metadata = {
  title: "Política de privacidad · Aterriza",
  description: "Qué datos recoge Aterriza, para qué los usa y qué derechos tienes.",
};

export default function PrivacyPage() {
  return <LegalPage name="privacidad" />;
}
