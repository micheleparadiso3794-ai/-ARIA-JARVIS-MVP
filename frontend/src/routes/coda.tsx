import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Inbox, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Confidence,
  EmptyState,
  Highlighted,
  PageHeader,
  PriorityTag,
  priorityVar,
  Skeleton,
  StatusTag,
} from "@/components/domain";
import { Button, buttonVariants } from "@/components/ui/button";
import { Sheet } from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { errorMessage, q, type Request, type Status, useSetStatus } from "@/lib/api";
import { cn, formatDate, timeAgo } from "@/lib/utils";

const STATUSES: Status[] = ["Da revisionare", "Assegnato", "In lavorazione", "Completato"];

export const Route = createFileRoute("/coda")({
  validateSearch: (s: Record<string, unknown>): { stato?: Status } =>
    STATUSES.includes(s.stato as Status) ? { stato: s.stato as Status } : {},
  component: Queue,
});

function Queue() {
  const { stato } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const requests = useQuery(q.requests());
  const [query, setQuery] = useState("");
  const [openId, setOpenId] = useState<number | null>(null);

  const all = requests.data ?? [];
  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of all) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [all]);

  const visible = all.filter((r) => {
    if (stato && r.status !== stato) return false;
    if (!query) return true;
    const t = query.toLowerCase();
    return [r.title, r.description, r.final_category, r.final_role].some((v) => v?.toLowerCase().includes(t));
  });

  const open = all.find((r) => r.id === openId);

  return (
    <div>
      <PageHeader title="Coda" description="Tutte le richieste, dalla più recente. Apri una riga per vederne la storia." />

      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:none]" role="tablist" aria-label="Filtra per stato">
          {[undefined, ...STATUSES].map((st) => {
            const active = stato === st;
            return (
              <button
                key={st ?? "tutte"}
                role="tab"
                aria-selected={active}
                onClick={() => navigate({ search: st ? { stato: st } : {} })}
                className={cn(
                  "flex h-9 shrink-0 items-center gap-2 rounded-full px-3.5 text-sm transition-colors",
                  active ? "bg-ink text-paper" : "text-muted hover:bg-ink/5 hover:text-ink",
                )}
              >
                {st ?? "Tutte"}
                <span className={cn("tnum text-xs", active ? "opacity-70" : "opacity-60")}>
                  {st ? (counts[st] ?? 0) : all.length}
                </span>
              </button>
            );
          })}
        </div>
        <label className="relative md:w-72">
          <span className="sr-only">Cerca</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Cerca per testo, reparto, persona"
            className="h-10 pl-9"
          />
        </label>
      </div>

      {requests.isLoading ? (
        <div className="grid gap-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : all.length === 0 ? (
        <EmptyState
          icon={<Inbox />}
          title="Nessuna richiesta"
          action={
            <Link to="/nuova" className={buttonVariants()}>
              Scrivi una richiesta
            </Link>
          }
        >
          Le richieste registrate compaiono qui con reparto, urgenza e stato.
        </EmptyState>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-muted">Nessuna richiesta corrisponde ai filtri.</p>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line bg-surface">
          <li className="hidden grid-cols-[1fr_9rem_11rem_8rem] gap-4 border-b border-line px-5 py-2.5 text-sm text-muted md:grid">
            <span>Richiesta</span>
            <span>Urgenza</span>
            <span>Responsabile</span>
            <span>Stato</span>
          </li>
          {visible.map((r) => (
            <li key={r.id} className="border-b border-line last:border-0">
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                className="relative grid w-full grid-cols-[1fr_auto] gap-x-4 gap-y-1 px-5 py-3.5 text-left transition-colors hover:bg-surface-2 md:grid-cols-[1fr_9rem_11rem_8rem] md:items-center"
              >
                <span
                  aria-hidden
                  className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
                  style={{ background: priorityVar(r.final_priority) }}
                />
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.title}</span>
                  <span className="block truncate text-sm text-muted">
                    {r.final_category}, {r.channel.toLowerCase()}, {timeAgo(r.created_at)}
                  </span>
                </span>
                <PriorityTag priority={r.final_priority} className="hidden md:inline-flex" />
                <span className="hidden truncate text-sm md:block">{r.final_role}</span>
                <span className="col-start-2 row-start-1 md:col-start-auto md:row-start-auto">
                  <StatusTag status={r.status} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <Sheet
        open={!!open}
        onOpenChange={(o) => !o && setOpenId(null)}
        title={open?.title}
        description={open && `Richiesta n. ${open.id}, arrivata ${formatDate(open.created_at)} da ${open.channel}`}
      >
        {open && <RequestDetail request={open} onDone={() => setOpenId(null)} />}
      </Sheet>
    </div>
  );
}

function RequestDetail({ request: r, onDone }: { request: Request; onDone: () => void }) {
  const setStatus = useSetStatus();
  const changed =
    r.final_category !== r.pred_category || r.final_priority !== r.pred_priority || r.final_role !== r.pred_role;

  const move = (status: Status, msg: string) =>
    setStatus.mutate(
      { id: r.id, status },
      { onSuccess: () => toast.success(msg), onError: (e) => toast.error(errorMessage(e)) },
    );

  return (
    <div className="grid gap-8">
      <div className="flex flex-wrap items-center gap-3">
        <StatusTag status={r.status} />
        <PriorityTag priority={r.final_priority} />
      </div>

      <p className="leading-relaxed">
        <Highlighted text={r.description} matches={r.matches} focusCategory={r.pred_category} />
      </p>

      <dl className="grid grid-cols-[8rem_1fr] gap-x-4 gap-y-3 text-sm">
        <dt className="text-muted">Reparto</dt>
        <dd className="font-medium">{r.final_category}</dd>
        <dt className="text-muted">Responsabile</dt>
        <dd className="font-medium">{r.final_role}</dd>
        <dt className="text-muted">Sicurezza</dt>
        <dd>
          <Confidence value={r.confidence} />
        </dd>
        {(r.user_category || r.user_urgency) && (
          <>
            <dt className="text-muted">Indicato da chi scrive</dt>
            <dd>{[r.user_category, r.user_urgency].filter(Boolean).join(", ")}</dd>
          </>
        )}
        {r.notes && (
          <>
            <dt className="text-muted">Note</dt>
            <dd>{r.notes}</dd>
          </>
        )}
      </dl>

      <section>
        <h3 className="mb-3 font-semibold">Storia</h3>
        <ol className="relative grid gap-5 border-l border-line pl-5 text-sm">
          <TimelineItem title="Arrivata" when={r.created_at}>
            Da {r.channel}.
          </TimelineItem>
          <TimelineItem title={`Proposta del sistema (regole ${r.rule_variant})`} when={r.created_at}>
            {r.pred_category}, urgenza {r.pred_priority.toLowerCase()}, a {r.pred_role}. {r.reasoning}
          </TimelineItem>
          {r.reviewed_at && (
            <TimelineItem title={changed ? "Corretta in revisione" : "Confermata in revisione"} when={r.reviewed_at}>
              {r.correction_reason}
            </TimelineItem>
          )}
        </ol>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-line pt-5">
        {r.needs_review && (
          <Link to="/revisione" search={{ id: r.id }} className={buttonVariants()}>
            Revisiona ora
          </Link>
        )}
        {r.status === "Assegnato" && (
          <Button onClick={() => move("In lavorazione", "Messa in lavorazione")} disabled={setStatus.isPending}>
            Metti in lavorazione
          </Button>
        )}
        {r.status === "In lavorazione" && (
          <Button onClick={() => move("Completato", "Segnata come completata")} disabled={setStatus.isPending}>
            Segna come completata
          </Button>
        )}
        {r.status === "Completato" && (
          <Button variant="secondary" onClick={() => move("In lavorazione", "Riaperta")} disabled={setStatus.isPending}>
            Riapri
          </Button>
        )}
        <Button variant="ghost" onClick={onDone}>
          Chiudi
        </Button>
      </div>
    </div>
  );
}

function TimelineItem({ title, when, children }: { title: string; when: string; children: React.ReactNode }) {
  return (
    <li className="relative">
      <span className="absolute top-1.5 -left-[25px] size-2.5 rounded-full border-2 border-surface bg-primary" />
      <p className="font-medium">
        {title} <span className="font-normal text-muted">{formatDate(when)}</span>
      </p>
      <p className="mt-0.5 text-muted">{children}</p>
    </li>
  );
}
