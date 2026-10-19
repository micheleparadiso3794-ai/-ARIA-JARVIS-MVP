import type * as React from "react";
import type { KeywordMatch, Priority, Status } from "@/lib/api";
import { cn } from "@/lib/utils";

const priorityColor: Record<Priority, string> = {
  Critica: "var(--p-critica)",
  Alta: "var(--p-alta)",
  Media: "var(--p-media)",
  Bassa: "var(--p-bassa)",
};

export function priorityVar(p: string | null | undefined) {
  return priorityColor[(p as Priority) ?? "Media"] ?? "var(--p-media)";
}

/** Priorità come segnale: barretta colorata + testo, mai solo colore. */
export function PriorityTag({ priority, className }: { priority: string | null; className?: string }) {
  const c = priorityVar(priority);
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 text-sm font-medium whitespace-nowrap", className)}
      style={{ color: c }}
    >
      <span aria-hidden className="h-3 w-1 rounded-full" style={{ background: c }} />
      {priority ?? "—"}
    </span>
  );
}

const statusStyle: Record<Status, string> = {
  "Da revisionare": "bg-alta/12 text-alta ring-alta/25",
  Assegnato: "bg-media/10 text-media ring-media/20",
  "In lavorazione": "bg-primary-soft text-primary ring-primary/20",
  Completato: "bg-ink/6 text-muted ring-ink/10",
};

export function StatusTag({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-2.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset",
        statusStyle[status],
      )}
    >
      {status}
    </span>
  );
}

/** Confidenza come barra a 10 tacche: si legge a colpo d'occhio, anche in elenco. */
export function Confidence({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const filled = Math.round(value * 10);
  const tone = value >= 0.6 ? "bg-primary" : value >= 0.4 ? "bg-alta" : "bg-critica";
  return (
    <span className="inline-flex items-center gap-2" title={`Confidenza ${Math.round(value * 100)}%`}>
      <span className="flex gap-[2px]" aria-hidden>
        {Array.from({ length: 10 }, (_, i) => (
          <span key={i} className={cn("h-3 w-[3px] rounded-full", i < filled ? tone : "bg-ink/12")} />
        ))}
      </span>
      {showLabel && <span className="tnum text-sm text-muted">{Math.round(value * 100)}%</span>}
    </span>
  );
}

/** Evidenzia nel testo le parole chiave che il motore ha riconosciuto. */
export function Highlighted({
  text,
  matches,
  priorityKeyword,
  focusCategory,
}: {
  text: string;
  matches: KeywordMatch[];
  priorityKeyword?: string | null;
  focusCategory?: string;
}) {
  const terms = new Map<string, "focus" | "other" | "priority">();
  for (const m of matches) {
    const cur = terms.get(m.keyword.toLowerCase());
    if (cur !== "focus") terms.set(m.keyword.toLowerCase(), m.category === focusCategory ? "focus" : "other");
  }
  if (priorityKeyword) terms.set(priorityKeyword.toLowerCase(), "priority");
  if (!terms.size || !text) return <>{text}</>;

  const escaped = [...terms.keys()]
    .sort((a, b) => b.length - a.length)
    .map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = new RegExp(`(?<![\\p{L}\\p{N}_])(${escaped.join("|")})(?![\\p{L}\\p{N}_])`, "giu");

  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const i = m.index ?? 0;
    if (i > last) parts.push(text.slice(last, i));
    const kind = terms.get(m[0].toLowerCase());
    parts.push(
      <mark
        key={i}
        className={cn(
          "rounded-[4px] px-0.5 text-inherit",
          kind === "focus" && "bg-mark text-mark-ink",
          kind === "other" && "bg-transparent underline decoration-muted decoration-dotted decoration-2 underline-offset-4",
          kind === "priority" && "bg-critica/15 text-critica",
        )}
      >
        {m[0]}
      </mark>,
    );
    last = i + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <>{parts}</>;
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-[-0.01em] text-balance">{title}</h1>
        {description && <p className="mt-2 text-base text-muted text-pretty">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  children,
  action,
}: {
  icon?: React.ReactNode;
  title: string;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-lg border border-dashed border-line-strong px-6 py-14 text-center">
      {icon && <div className="mb-4 text-muted [&_svg]:size-8">{icon}</div>}
      <h2 className="text-lg font-semibold">{title}</h2>
      {children && <p className="mt-1 max-w-md text-muted text-pretty">{children}</p>}
      {action && <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

export function Panel({ className, ...props }: React.ComponentProps<"section">) {
  return <section className={cn("rounded-lg border border-line bg-surface", className)} {...props} />;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink/6", className)} />;
}
