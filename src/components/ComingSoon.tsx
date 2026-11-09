import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { buttonClasses } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Icon } from "@/components/icons/Icon";
import { SECTIONS } from "@/lib/sections";

/** Placeholder page for a section that is not released yet. */
export function ComingSoon({ href }: { href: string }) {
  const section = SECTIONS.find((s) => s.href === href);
  if (!section) throw new Error(`Unknown section: ${href}`);

  return (
    <main className="flex flex-col gap-6">
      <h1 className="text-3xl font-extrabold tracking-tight text-heading">
        {section.label}
      </h1>
      <Card className="flex flex-col items-center gap-3 py-8 text-center">
        <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
          <Icon name={section.icon} size={28} />
        </span>
        <Badge variant="warning">Próximamente</Badge>
        <p className="text-muted">{section.description}</p>
      </Card>
      <Link
        href="/inicio"
        className={buttonClasses("secondary", "md", "self-center")}
      >
        Volver al inicio
      </Link>
    </main>
  );
}
