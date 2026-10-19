import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Inbox, Plus } from "lucide-react";
import { toast } from "sonner";
import { Confidence, EmptyState, Panel, PriorityTag, Skeleton } from "@/components/domain";
import { Button, buttonVariants } from "@/components/ui/button";
import { errorMessage, type Priority, q, type Status, useSeedRequests } from "@/lib/api";
import { cn, timeAgo } from "@/lib/utils";

export const Route = createFileRoute("/")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q.stats()),
  component: Overview,
});

const STAGES: { status: Status; label: string; hint: string }[] = [
  { status: "Da revisionare", label: "Da revisionare", hint: "aspettano una decisione" },
  { status: "Assegnato", label: "Assegnate", hint: "smistate in automatico" },
  { status: "In lavorazione", label: "In lavorazione", hint: "qualcuno ci sta lavorando" },
  { status: "Completato", label: "Completate", hint: "chiuse" },
];

const PRIORITIES: Priority[] = ["Critica", "Alta", "Media", "Bassa"];

function Overview() {
  const stats = useQuery(q.stats());
  const pending = useQuery(q.requests({ needs_review: true }));
  const seed = useSeedRequests();

  const s = stats.data;
  const total = s?.total ?? 0;

  const loadSamples = () =>
    seed.mutate(undefined, {
      onSuccess: (r) => toast.success(`${r.created} richieste di prova caricate in coda`),
      onError: (e) => toast.error(errorMessage(e)),
    });

  return (
    <div>
      <section className="mb-12">
        <p className="text-sm text-muted">NSE, New Solution Enterprise</p>
        <h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-[-0.025em] text-balance">
          Le richieste non si perdono. Diventano lavoro.
        </h1>
      </section>

      {stats.isLoading ? (
        <Skeleton className="h-40" />
      ) : total === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="La coda è vuota"
          action={
            <>
              <Link to="/nuova" className={buttonVariants()}>
                <Plus /> Scrivi una richiesta
              </Link>
              <Button variant="secondary" onClick={loadSamples} disabled={seed.isPending}>
                Carica 30 richieste di prova
              </Button>
            </>
          }
        >
          Scrivi la prima richiesta e guarda il sistema smistarla mentre digiti, oppure carica i casi di prova per
          esplorare il flusso completo.
        </EmptyState>
      ) : (
        <>
          {/* Flusso: ogni tappa è proporzionale al numero di richieste che contiene */}
          <section aria-labelledby="flow-title" className="mb-12">
            <div className="mb-4 flex items-baseline justify-between gap-4">
              <h2 id="flow-title" className="text-lg font-semibold">
                Dove sono le {total} richieste
              </h2>
              <Link to="/coda" className="text-sm text-primary hover:underline underline-offset-4">
                Apri la coda
              </Link>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-ink/6">
              {STAGES.map((st, i) => {
                const n = s?.by_status[st.status] ?? 0;
                return (
                  <div
                    key={st.status}
                    className="animate-flow h-full"
                    style={{
                      width: `${(n / total) * 100}%`,
                      background: stageColor[i],
                      animationDelay: `${i * 120}ms`,
                    }}
                  />
                );
              })}
            </div>
            <ol className="mt-5 grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-4">
              {STAGES.map((st, i) => (
                <li key={st.status}>
                  <Link
                    to="/coda"
                    search={{ stato: st.status }}
                    className="group block rounded-md outline-offset-4"
                  >
                    <span className="flex items-center gap-2 text-sm text-muted">
                      <span className="size-2 rounded-full" style={{ background: stageColor[i] }} />
                      {st.label}
                    </span>
                    <span className="tnum mt-1 block text-2xl font-semibold group-hover:text-primary">
                      {s?.by_status[st.status] ?? 0}
                    </span>
                    <span className="text-sm text-muted">{st.hint}</span>
                  </Link>
                </li>
              ))}
            </ol>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
            <Panel>
              <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4">
                <h2 className="font-semibold">Aspettano una decisione</h2>
                {(s?.pending_review ?? 0) > 0 && (
                  <Link to="/revisione" className={buttonVariants({ size: "sm" })}>
                    Inizia la revisione <ArrowRight />
                  </Link>
                )}
              </div>
              {pending.data?.length ? (
                <ul className="divide-y divide-line">
                  {pending.data.slice(0, 6).map((r) => (
                    <li key={r.id}>
                      <Link
                        to="/revisione"
                        search={{ id: r.id }}
                        className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-1 px-5 py-3.5 hover:bg-surface-2"
                      >
                        <span className="truncate font-medium">{r.title}</span>
                        <PriorityTag priority={r.pred_priority} />
                        <span className="truncate text-sm text-muted">
                          {r.pred_category}, {timeAgo(r.created_at)}
                        </span>
                        <Confidence value={r.confidence} showLabel={false} />
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="px-5 py-10 text-center text-muted">Nessuna richiesta da revisionare.</p>
              )}
            </Panel>

            <Panel className="p-5">
              <h2 className="font-semibold">Per urgenza</h2>
              <ul className="mt-5 grid gap-4">
                {PRIORITIES.map((p) => {
                  const n = s?.by_priority[p] ?? 0;
                  return (
                    <li key={p} className="grid grid-cols-[5.5rem_1fr_2rem] items-center gap-3">
                      <PriorityTag priority={p} />
                      <span className="h-2 overflow-hidden rounded-full bg-ink/6">
                        <span
                          className="block h-full rounded-full"
                          style={{
                            width: `${total ? (n / total) * 100 : 0}%`,
                            background: `var(--p-${p.toLowerCase()})`,
                          }}
                        />
                      </span>
                      <span className="tnum text-right text-sm">{n}</span>
                    </li>
                  );
                })}
              </ul>
              <h2 className="mt-8 font-semibold">Per reparto</h2>
              <ul className="mt-3 divide-y divide-line text-sm">
                {Object.entries(s?.by_category ?? {})
                  .sort((a, b) => b[1] - a[1])
                  .map(([cat, n]) => (
                    <li key={cat} className="flex justify-between gap-4 py-2">
                      <span className="text-muted">{cat}</span>
                      <span className="tnum">{n}</span>
                    </li>
                  ))}
              </ul>
            </Panel>
          </div>

          <p className={cn("mt-8 text-sm text-muted")}>
            {s?.test_runs
              ? `${s.test_runs} prove eseguite sul motore di regole.`
              : "Nessuna prova ancora eseguita sul motore di regole."}{" "}
            <Link to="/prove" className="text-primary hover:underline underline-offset-4">
              Vai alle prove
            </Link>
          </p>
        </>
      )}
    </div>
  );
}

const stageColor = ["var(--p-alta)", "var(--p-media)", "var(--primary)", "var(--p-bassa)"];
