import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Minimal Markdown renderer for the legal pages (src/content/legal/*.md).
 * Supports what those files use: # / ## headings, paragraphs, "- " lists,
 * tables, "---", **bold**, *italic*, [links](/path) and [COMPLETAR: …]
 * placeholders, which are highlighted so they are easy to find and fill in.
 */

const INLINE = /\[COMPLETAR[^\]]*\]|\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;

const linkClass =
  "font-bold text-link underline underline-offset-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring";

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(INLINE)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const key = `${keyPrefix}-${index++}`;
    const [whole, bold, italic, label, href] = match;
    if (whole.startsWith("[COMPLETAR")) {
      nodes.push(
        <mark
          key={key}
          className="rounded border border-warning bg-warning-soft px-1 font-bold text-on-warning-soft"
        >
          {whole}
        </mark>,
      );
    } else if (bold !== undefined) {
      nodes.push(
        <strong key={key} className="font-bold text-heading">
          {inline(bold, key)}
        </strong>,
      );
    } else if (italic !== undefined) {
      nodes.push(<em key={key}>{inline(italic, key)}</em>);
    } else if (label !== undefined && href !== undefined) {
      nodes.push(
        href.startsWith("/") ? (
          <Link key={key} href={href} className={linkClass}>
            {label}
          </Link>
        ) : (
          <a key={key} href={href} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {label}
            <span className="sr-only"> (se abre en una pestaña nueva)</span>
          </a>
        ),
      );
    }
    last = start + whole.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

function tableCells(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

/** Parses the document; the first "# " heading is returned apart (page title). */
export function parseLegalMarkdown(source: string): { title: string; body: ReactNode[] } {
  const lines = source.replace(/\r\n?/g, "\n").split("\n");
  const body: ReactNode[] = [];
  let title = "";
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    const k = `b${key++}`;

    if (trimmed === "") {
      i++;
    } else if (trimmed.startsWith("# ")) {
      title = trimmed.slice(2).trim();
      i++;
    } else if (trimmed.startsWith("## ")) {
      body.push(
        <h2 key={k} className="mt-4 text-xl font-extrabold text-heading">
          {inline(trimmed.slice(3).trim(), k)}
        </h2>,
      );
      i++;
    } else if (/^-{3,}$/.test(trimmed)) {
      body.push(<hr key={k} className="border-border/30" />);
      i++;
    } else if (trimmed.startsWith("|")) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const cells = tableCells(lines[i]);
        if (!cells.every((c) => /^:?-{3,}:?$/.test(c))) rows.push(cells);
        i++;
      }
      const [head, ...rest] = rows;
      body.push(
        <div key={k} className="-mx-1 overflow-x-auto rounded-xl border border-border/30">
          <table className="w-full min-w-[480px] border-collapse text-left text-sm">
            <thead className="bg-accent-soft text-on-accent-soft">
              <tr>
                {head.map((cell, c) => (
                  <th key={c} scope="col" className="p-2 font-bold">
                    {inline(cell, `${k}h${c}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rest.map((row, r) => (
                <tr key={r} className="border-t border-border/30 align-top">
                  {row.map((cell, c) => (
                    <td key={c} className="p-2">
                      {inline(cell, `${k}r${r}c${c}`)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
    } else if (trimmed.startsWith("- ")) {
      const items: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith("- ")) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      body.push(
        <ul key={k} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-accent">
          {items.map((item, n) => (
            <li key={n}>{inline(item, `${k}-${n}`)}</li>
          ))}
        </ul>,
      );
    } else {
      const paragraph: string[] = [];
      while (i < lines.length && lines[i].trim() !== "" && !/^(#|\||- |-{3,}$)/.test(lines[i].trim())) {
        paragraph.push(lines[i].trim());
        i++;
      }
      body.push(<p key={k}>{inline(paragraph.join(" "), k)}</p>);
    }
  }
  return { title, body };
}
