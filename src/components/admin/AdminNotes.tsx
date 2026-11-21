import { Card } from "@/components/ui/Card";

export type AdminNoteView = {
  id: string;
  /** "Este registro" or "Equivalencia en Colombia"… */
  label: string;
  notes: string | null;
  referenceUrl: string | null;
};

/** Internal notes (public.admin_notes): only admins can read them. */
export function AdminNotes({ notes }: { notes: AdminNoteView[] }) {
  if (notes.length === 0) return null;
  return (
    <Card role="region" className="flex flex-col gap-3" aria-labelledby="admin-notes-title">
      <div className="flex flex-col gap-1">
        <h2 id="admin-notes-title" className="text-lg font-extrabold text-heading">
          Notas internas
        </h2>
        <p className="text-sm text-muted">Solo las ve el equipo admin. No se muestran en la app.</p>
      </div>
      <ul className="flex flex-col gap-3">
        {notes.map((note) => (
          <li key={note.id} className="flex flex-col gap-1 rounded-xl bg-warning-soft p-3 text-on-warning-soft">
            <p className="text-sm font-bold">{note.label}</p>
            {note.notes && <p className="whitespace-pre-line text-sm">{note.notes}</p>}
            {note.referenceUrl && (
              <a
                href={note.referenceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-sm font-bold underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {note.referenceUrl}
                <span className="sr-only"> (se abre en una pestaña nueva)</span>
              </a>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
