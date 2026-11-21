import Link from "next/link";
import { ACCEPT_TERMS_FIELD, PRIVACY_PATH, TERMS_PATH } from "@/lib/legal";

const linkClass =
  "font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

/** Required "18+ and I accept" checkbox. Links open in a new tab so the form keeps its state. */
export function AcceptTermsCheckbox({
  checked,
  onChange,
}: {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/30 bg-surface p-3">
      <input
        id={ACCEPT_TERMS_FIELD}
        name={ACCEPT_TERMS_FIELD}
        type="checkbox"
        required
        checked={checked}
        onChange={onChange ? (e) => onChange(e.target.checked) : undefined}
        className="mt-0.5 size-6 shrink-0 accent-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      />
      <label htmlFor={ACCEPT_TERMS_FIELD} className="text-foreground">
        Tengo 18 años o más y acepto los{" "}
        <Link href={TERMS_PATH} target="_blank" rel="noopener" className={linkClass}>
          Términos de uso
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </Link>{" "}
        y la{" "}
        <Link href={PRIVACY_PATH} target="_blank" rel="noopener" className={linkClass}>
          Política de privacidad
          <span className="sr-only"> (se abre en una pestaña nueva)</span>
        </Link>
        .
      </label>
    </div>
  );
}
