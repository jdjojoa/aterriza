import { Card } from "@/components/ui/Card";
import { Icon, type IconName } from "@/components/icons/Icon";

/** Shown when a list has no published content yet. */
export function EmptyState({
  icon,
  title,
  description,
}: {
  icon: IconName;
  title: string;
  description: string;
}) {
  return (
    <Card className="flex flex-col items-center gap-3 py-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-accent-soft text-on-accent-soft">
        <Icon name={icon} size={28} />
      </span>
      <p className="text-lg font-bold text-heading">{title}</p>
      <p className="text-muted">{description}</p>
    </Card>
  );
}
