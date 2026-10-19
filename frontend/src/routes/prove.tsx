import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Check, FlaskConical, Play, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel, PriorityTag, Skeleton } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { errorMessage, q, type TestRun, type TestRunSummary, useRunTest, type Variant } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/prove")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q.meta()),
  component: Lab,
});

const METRICS: { key: keyof TestRunSummary; label: string; lowerIsBetter?: boolean; unit?: string }[] = [
  { key: "accuracy_cat", label: "Reparto giusto" },
  { key: "accuracy_prio", label: "Urgenza giusta" },
  { key: "accuracy_role", label: "Responsabile giusto" },
  { key: "review_rate", label: "Mandate in revisione", lowerIsBetter: true },
];

function Lab() {
  const meta = useQuery(q.meta()).data!;
  const runs = useQuery(q.testRuns());
  const [variant, setVariant] = useState<Variant>("A");
  const [runId, setRunId] = useState<number | null>(null);
  const run = useRunTest();

  const latestId = runId ?? runs.data?.[0]?.id;
  const detail = useQuery({ ...q.testRun(latestId ?? 0), enabled: !!latestId });

  const execute = () =>
    run.mutate(variant, {
      onSuccess: (r) => {
        setRunId(r.id);
        toast.success(`Prova completata con ${meta.variants[variant]}`, {
          description: `Reparto giusto nel ${r.accuracy_cat}% dei casi.`,
        });
      },
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <div>
      <PageHeader
        title="Prove sul motore"
        description="Il motore di regole viene messo alla prova su 30 richieste sintetiche di cui conosciamo la risposta giusta. È una verifica preliminare, non sostituisce la prova con dati reali."
      />

      <Panel className="mb-8 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-sm text-muted">Regole da provare</span>
          <Segmented
            aria-label="Variante delle regole"
            value={variant}
            onValueChange={setVariant}
            options={(Object.keys(meta.variants) as Variant[]).map((v) => ({ value: v, label: meta.variants[v] }))}
          />
        </div>
        <Button size="lg" onClick={execute} disabled={run.isPending}>
          <Play /> {run.isPending ? "Prova in corso" : "Esegui la prova"}
        </Button>
      </Panel>

      <Tabs defaultValue="risultati">
        <TabsList>
          <TabsTab value="risultati">Ultimo risultato</TabsTab>
          <TabsTab value="confronto">Confronto A/B</TabsTab>
          <TabsTab value="storico">Storico</TabsTab>
          <TabsTab value="dataset">Casi di prova</TabsTab>
        </TabsList>

        <TabsPanel value="risultati">
          {runs.isLoading ? (
            <Skeleton className="h-64" />
          ) : !latestId ? (
            <EmptyState icon={<FlaskConical />} title="Nessuna prova eseguita">
              Scegli le regole e premi «Esegui la prova» per vedere quanto spesso il motore indovina.
            </EmptyState>
          ) : detail.data ? (
            <RunResult run={detail.data} label={meta.variants[detail.data.variant]} />
          ) : (
            <Skeleton className="h-64" />
          )}
        </TabsPanel>

        <TabsPanel value="confronto">
          <Compare labels={meta.variants} />
        </TabsPanel>

        <TabsPanel value="storico">
          <History runs={runs.data ?? []} labels={meta.variants} onOpen={setRunId} activeId={latestId} />
        </TabsPanel>

        <TabsPanel value="dataset">
          <Dataset />
        </TabsPanel>
      </Tabs>
    </div>
  );
}

function MetricBar({ label, value, lowerIsBetter }: { label: string; value: number; lowerIsBetter?: boolean }) {
  return (
    <div>
      <p className="text-sm text-muted">{label}</p>
      <p className="tnum mt-1 text-2xl font-semibold">{Math.round(value)}%</p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/8">
        <div
          className={cn("h-full rounded-full transition-[width] duration-500", lowerIsBetter ? "bg-alta" : "bg-primary")}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

function RunResult({
  run,
  label,
}: {
  run: TestRun;
  label: string;
}) {
  const [onlyErrors, setOnlyErrors] = useState(false);
  const rows = run.results.filter(
    (r) => !onlyErrors || r.target_cat !== r.pred_cat || r.target_prio !== r.pred_prio || r.target_role !== r.pred_role,
  );

  return (
    <div className="grid gap-6">
      <p className="text-sm text-muted">
        {label}, {formatDate(run.run_date)}, {run.total_samples} casi, {run.avg_time_ms.toFixed(2)} ms per richiesta
      </p>
      <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
        {METRICS.map((m) => (
          <MetricBar key={m.key} label={m.label} value={run[m.key] as number} lowerIsBetter={m.lowerIsBetter} />
        ))}
      </div>

      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-3">
          <h3 className="font-semibold">Caso per caso</h3>
          <label className="flex items-center gap-2 text-sm text-muted">
            <input
              type="checkbox"
              checked={onlyErrors}
              onChange={(e) => setOnlyErrors(e.target.checked)}
              className="size-4 accent-(--primary)"
            />
            Solo gli errori
          </label>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[46rem] text-sm">
            <thead className="text-left text-muted">
              <tr className="border-b border-line">
                <th className="px-5 py-2.5 font-normal">Caso</th>
                <th className="px-3 py-2.5 font-normal">Reparto</th>
                <th className="px-3 py-2.5 font-normal">Urgenza</th>
                <th className="px-3 py-2.5 font-normal">Responsabile</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-5 py-3">
                    <span className="tnum mr-2 text-muted">{r.id}</span>
                    {r.title}
                  </td>
                  <Cell ok={r.target_cat === r.pred_cat} expected={r.target_cat} got={r.pred_cat} />
                  <Cell ok={r.target_prio === r.pred_prio} expected={r.target_prio} got={r.pred_prio} priority />
                  <Cell ok={r.target_role === r.pred_role} expected={r.target_role} got={r.pred_role} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}

function Cell({ ok, expected, got, priority }: { ok: boolean; expected: string; got: string; priority?: boolean }) {
  return (
    <td className="px-3 py-3 align-top">
      <span className="flex items-start gap-1.5">
        {ok ? (
          <Check className="mt-0.5 size-4 shrink-0 text-ok" aria-label="Giusto" />
        ) : (
          <X className="mt-0.5 size-4 shrink-0 text-danger" aria-label="Sbagliato" />
        )}
        <span>
          {priority ? <PriorityTag priority={got} /> : got}
          {!ok && <span className="block text-xs text-muted">atteso: {expected}</span>}
        </span>
      </span>
    </td>
  );
}

function Compare({ labels }: { labels: Record<Variant, string> }) {
  const cmp = useQuery(q.compare());
  if (cmp.isLoading) return <Skeleton className="h-48" />;
  const a = cmp.data?.A;
  const b = cmp.data?.B;
  if (!a || !b)
    return (
      <EmptyState title="Serve una prova per ciascuna variante">
        Esegui almeno una prova con {labels.A} e una con {labels.B}: qui le vedrai affiancate.
      </EmptyState>
    );

  const rows = [
    ...METRICS.map((m) => ({ ...m, a: a[m.key] as number, b: b[m.key] as number, unit: "%" })),
    { key: "avg_time_ms", label: "Tempo per richiesta", a: a.avg_time_ms, b: b.avg_time_ms, unit: " ms", lowerIsBetter: true },
  ];

  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[32rem] text-sm">
        <thead className="text-left text-muted">
          <tr className="border-b border-line">
            <th className="px-5 py-3 font-normal">Misura</th>
            <th className="px-3 py-3 text-right font-normal">{labels.A}</th>
            <th className="px-3 py-3 text-right font-normal">{labels.B}</th>
            <th className="px-5 py-3 text-right font-normal">Differenza</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const diff = r.b - r.a;
            const better = r.lowerIsBetter ? diff < 0 : diff > 0;
            const digits = r.unit === " ms" ? 3 : 1;
            return (
              <tr key={r.key} className="border-b border-line last:border-0">
                <td className="px-5 py-3">{r.label}</td>
                <td className="tnum px-3 py-3 text-right">{r.a.toFixed(digits)}{r.unit}</td>
                <td className="tnum px-3 py-3 text-right">{r.b.toFixed(digits)}{r.unit}</td>
                <td
                  className={cn(
                    "tnum px-5 py-3 text-right font-medium",
                    diff === 0 ? "text-muted" : better ? "text-ok" : "text-danger",
                  )}
                >
                  {diff > 0 ? "+" : ""}
                  {diff.toFixed(digits)}
                  {r.unit}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="border-t border-line px-5 py-3 text-sm text-muted">
        Confronto tra l'ultima prova di ciascuna variante. In verde dove {labels.B} fa meglio.
      </p>
    </Panel>
  );
}

function History({
  runs,
  labels,
  onOpen,
  activeId,
}: {
  runs: TestRunSummary[];
  labels: Record<Variant, string>;
  onOpen: (id: number) => void;
  activeId?: number;
}) {
  if (!runs.length) return <p className="py-10 text-center text-muted">Nessuna prova nello storico.</p>;
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[40rem] text-sm">
        <thead className="text-left text-muted">
          <tr className="border-b border-line">
            <th className="px-5 py-3 font-normal">Quando</th>
            <th className="px-3 py-3 font-normal">Regole</th>
            {METRICS.map((m) => (
              <th key={m.key} className="px-3 py-3 text-right font-normal">
                {m.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {runs.map((r) => (
            <tr
              key={r.id}
              onClick={() => onOpen(r.id)}
              className={cn(
                "cursor-pointer border-b border-line last:border-0 hover:bg-surface-2",
                r.id === activeId && "bg-primary-soft",
              )}
            >
              <td className="px-5 py-3">{formatDate(r.run_date)}</td>
              <td className="px-3 py-3">{labels[r.variant]}</td>
              {METRICS.map((m) => (
                <td key={m.key} className="tnum px-3 py-3 text-right">
                  {Math.round(r[m.key] as number)}%
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="border-t border-line px-5 py-3 text-sm text-muted">
        Seleziona una riga per vederla in «Ultimo risultato».
      </p>
    </Panel>
  );
}

function Dataset() {
  const data = useQuery(q.dataset());
  if (!data.data) return <Skeleton className="h-64" />;
  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {data.data.map((d) => (
        <li key={d.id} className="rounded-lg border border-line bg-surface p-4">
          <div className="flex items-start justify-between gap-3">
            <p className="font-medium">
              <span className="tnum mr-2 text-muted">{d.id}</span>
              {d.title}
            </p>
            <PriorityTag priority={d.target_prio} />
          </div>
          <p className="mt-1 text-sm text-muted">{d.description}</p>
          <p className="mt-3 text-sm">
            {d.target_cat}, a {d.target_role}
          </p>
        </li>
      ))}
    </ul>
  );
}
