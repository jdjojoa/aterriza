import type { IconName } from "@/components/icons/Icon";

export type Section = {
  href: string;
  label: string;
  description: string;
  icon: IconName;
  /** false = shows "Próximamente" (planned for the 18 Nov release). */
  available: boolean;
};

/** Main sections, in BottomNav order. */
export const SECTIONS: Section[] = [
  {
    href: "/inicio",
    label: "Inicio",
    description: "Tu resumen de llegada.",
    icon: "home",
    available: true,
  },
  {
    href: "/transporte",
    label: "Transporte",
    description: "Combis, mototaxis y rutas para moverte por Piura.",
    icon: "bus",
    available: true,
  },
  {
    href: "/lugares",
    label: "Lugares",
    description: "Salud, trámites, comida y universidades en el mapa.",
    icon: "map-pin",
    available: true,
  },
  {
    href: "/identificar",
    label: "Identificar",
    description: "Toma una foto de un medicamento o una comida y entiende qué es.",
    icon: "camera",
    available: false,
  },
  {
    href: "/chat",
    label: "Chat",
    description: "Pregunta lo que necesites sobre tu llegada a Piura.",
    icon: "chat",
    available: false,
  },
];
