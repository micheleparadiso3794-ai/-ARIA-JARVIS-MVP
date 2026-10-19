import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader, Panel, PriorityTag } from "@/components/domain";
import { Segmented } from "@/components/ui/segmented";
import { q, type Variant } from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/regole")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q.rules()),
  component: Rules,
});

function Rules() {
  const rules = useQuery(q.rules()).data!;
  const [variant, setVariant] = useState<Variant>("A");
  const other: Variant = variant === "A" ? "B" : "A";
  const set = rules[variant];
  const otherSet = rules[other];

  const onlyHere = (cat: string, kw: string) => !otherSet.categories[cat]?.keywords.includes(kw);

  return (
    <div>
      <PageHeader
        title="Regole"
        description="Il motore cerca queste parole nel testo. Il reparto con più parole trovate vince; alcune parole alzano l'urgenza."
        actions={
          <Segmented
            aria-label="Variante"
            value={variant}
            onValueChange={setVariant}
            options={(Object.keys(rules) as Variant[]).map((v) => ({ value: v, label: rules[v].label }))}
          />
        }
      />

      <dl className="mb-8 grid gap-6 sm:grid-cols-3">
        <div>
          <dt className="text-sm text-muted">Descrizione</dt>
          <dd className="mt-1">{set.description}</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Sicurezza minima per l'assegnazione automatica</dt>
          <dd className="tnum mt-1 text-xl font-semibold">{Math.round(set.confidence_threshold * 100)}%</dd>
        </div>
        <div>
          <dt className="text-sm text-muted">Revisione umana</dt>
          <dd className="mt-1">
            {set.require_human_review ? "Sempre, per ogni richiesta" : "Solo sotto la soglia o nei casi ambigui"}
          </dd>
        </div>
      </dl>

      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(set.categories).map(([cat, c]) => (
          <Panel key={cat} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold">{cat}</h2>
                <p className="text-sm text-muted">va a {c.target_role}</p>
              </div>
              <PriorityTag priority={c.default_priority} />
            </div>
            <ul className="mt-4 flex flex-wrap gap-1.5">
              {c.keywords.map((kw) => (
                <li
                  key={kw}
                  title={onlyHere(cat, kw) ? `Solo in ${set.label}` : undefined}
                  className={cn(
                    "rounded-full px-2.5 py-1 text-sm",
                    onlyHere(cat, kw) ? "bg-mark text-mark-ink" : "bg-ink/6",
                  )}
                >
                  {kw}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">
        <span className="mr-1.5 inline-block size-2.5 rounded-full bg-mark align-middle" />
        Parole presenti solo in {set.label}.
      </p>

      <h2 className="mt-10 mb-4 text-lg font-semibold">Parole che alzano l'urgenza</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {Object.entries(set.priority_boosters).map(([prio, kws]) => (
          <Panel key={prio} className="p-5">
            <PriorityTag priority={prio} />
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {kws.map((kw) => (
                <li key={kw} className="rounded-full bg-ink/6 px-2.5 py-1 text-sm">
                  {kw}
                </li>
              ))}
            </ul>
          </Panel>
        ))}
      </div>
      <p className="mt-3 text-sm text-muted">Se compaiono parole di più livelli, vale la più grave.</p>
    </div>
  );
}
