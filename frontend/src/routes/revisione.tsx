import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  Confidence,
  EmptyState,
  Highlighted,
  PageHeader,
  Panel,
  PriorityTag,
  priorityVar,
  Skeleton,
} from "@/components/domain";
import { Button, buttonVariants } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import { errorMessage, type Priority, q, type Request, useReviewRequest } from "@/lib/api";
import { cn, formatDate } from "@/lib/utils";

export const Route = createFileRoute("/revisione")({
  validateSearch: (s: Record<string, unknown>): { id?: number } =>
    Number.isInteger(Number(s.id)) && s.id !== undefined ? { id: Number(s.id) } : {},
  loader: ({ context }) =>
    Promise.all([context.queryClient.ensureQueryData(q.meta()), context.queryClient.ensureQueryData(q.rules())]),
  component: Review,
});

const REASONS = [
  "Proposta corretta",
  "Reparto sbagliato",
  "Urgenza sottovalutata",
  "Urgenza sopravvalutata",
  "Testo incompleto, verificato a voce",
];

function Review() {
  const { id } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const pending = useQuery(q.requests({ needs_review: true }));
  const list = pending.data ?? [];
  const selected = list.find((r) => r.id === id) ?? list[0];

  const select = (rid: number | undefined) => navigate({ search: rid ? { id: rid } : {}, replace: true });

  if (pending.isLoading) return <Skeleton className="h-96" />;

  return (
    <div>
      <PageHeader
        title="Revisione"
        description="Controlla la proposta del sistema, correggila se serve e conferma. Solo dopo la richiesta passa al responsabile."
      />

      {list.length === 0 ? (
        <EmptyState
          icon={<CheckCircle2 />}
          title="Tutto revisionato"
          action={
            <Link to="/coda" className={buttonVariants({ variant: "secondary" })}>
              Apri la coda
            </Link>
          }
        >
          Non ci sono richieste in attesa di una decisione.
        </EmptyState>
      ) : (
        <div className="grid items-start gap-6 lg:grid-cols-[20rem_1fr]">
          <Panel className="lg:sticky lg:top-8">
            <p className="border-b border-line px-4 py-3 text-sm text-muted">
              <span className="tnum font-semibold text-ink">{list.length}</span> in attesa
            </p>
            <ul className="max-h-[22rem] overflow-y-auto lg:max-h-[calc(100dvh-14rem)]">
              {list.map((r) => {
                const active = r.id === selected?.id;
                return (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => select(r.id)}
                      aria-current={active}
                      className={cn(
                        "relative grid w-full gap-1 border-b border-line px-4 py-3 text-left transition-colors last:border-0",
                        active ? "bg-primary-soft" : "hover:bg-surface-2",
                      )}
                    >
                      <span
                        aria-hidden
                        className="absolute inset-y-3 left-0 w-[3px] rounded-r-full"
                        style={{ background: priorityVar(r.pred_priority) }}
                      />
                      <span className="truncate text-sm font-medium">{r.title}</span>
                      <span className="flex items-center justify-between gap-2">
                        <span className="truncate text-xs text-muted">{r.pred_category}</span>
                        <Confidence value={r.confidence} showLabel={false} />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </Panel>

          {selected && (
            <Decision
              key={selected.id}
              request={selected}
              onSaved={() => {
                const idx = list.findIndex((r) => r.id === selected.id);
                select(list[idx + 1]?.id ?? list[idx - 1]?.id);
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}

function Decision({ request: r, onSaved }: { request: Request; onSaved: () => void }) {
  const meta = useQuery(q.meta()).data!;
  const rules = useQuery(q.rules()).data!;
  const review = useReviewRequest();

  const known = meta.categories.includes(r.pred_category);
  const [category, setCategory] = useState(known ? r.pred_category : "");
  const [priority, setPriority] = useState<Priority>(r.pred_priority);
  const [role, setRole] = useState(known ? r.pred_role : "");
  const [reason, setReason] = useState("");
  const [tried, setTried] = useState(false);

  // Cambiando reparto si propone il suo responsabile abituale
  const onCategory = (c: string) => {
    setCategory(c);
    const target = rules[r.rule_variant]?.categories[c]?.target_role;
    if (target) setRole(target);
  };

  const changed = category !== r.pred_category || priority !== r.pred_priority || role !== r.pred_role;
  useEffect(() => {
    if (!reason || REASONS.includes(reason)) setReason(changed ? "" : "Proposta corretta");
  }, [changed]);

  const missing = !category || !role || reason.trim().length < 3;

  const save = () => {
    setTried(true);
    if (missing) return;
    review.mutate(
      { id: r.id, final_category: category, final_priority: priority, final_role: role, reason: reason.trim() },
      {
        onSuccess: () => {
          toast.success(changed ? "Correzione salvata" : "Proposta confermata", {
            description: `${r.title} ora è in lavorazione da ${role}.`,
          });
          onSaved();
        },
        onError: (e) => toast.error(errorMessage(e)),
      },
    );
  };

  return (
    <div className="grid gap-6">
      <Panel className="p-6">
        <p className="text-sm text-muted">
          Richiesta n. {r.id}, da {r.channel}, {formatDate(r.created_at)}
        </p>
        <h2 className="mt-1 text-xl font-semibold tracking-[-0.01em] text-balance">
          <Highlighted text={r.title} matches={r.matches} focusCategory={r.pred_category} />
        </h2>
        <p className="mt-3 max-w-prose leading-relaxed">
          <Highlighted text={r.description} matches={r.matches} focusCategory={r.pred_category} />
        </p>
        {(r.user_category || r.user_urgency || r.notes) && (
          <p className="mt-4 text-sm text-muted">
            Chi ha scritto indica: {[r.user_category, r.user_urgency, r.notes].filter(Boolean).join(", ")}
          </p>
        )}

        <div className="mt-6 grid gap-4 rounded-md bg-surface-2 p-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
          <div>
            <p className="text-sm text-muted">Il sistema propone</p>
            <p className="font-medium">
              {r.pred_category}, a {r.pred_role}
            </p>
          </div>
          <PriorityTag priority={r.pred_priority} />
          <Confidence value={r.confidence} />
        </div>
        <p className="mt-3 text-sm text-muted">{r.reasoning}</p>
        {!known && (
          <p className="mt-3 flex gap-2 text-sm">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-alta" />
            Il sistema non ha riconosciuto il reparto. Sceglilo tu.
          </p>
        )}
      </Panel>

      <Panel className="p-6">
        <h3 className="font-semibold">La tua decisione</h3>
        <div className="mt-5 grid gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Reparto" htmlFor="category" error={tried && !category ? "Scegli il reparto." : undefined}>
              <Select id="category" value={category} onValueChange={onCategory} options={meta.categories} placeholder="Scegli il reparto" />
            </Field>
            <Field label="Responsabile" htmlFor="role" error={tried && !role ? "Scegli il responsabile." : undefined}>
              <Select id="role" value={role} onValueChange={setRole} options={meta.roles} placeholder="Scegli il responsabile" />
            </Field>
          </div>
          <Field label="Urgenza">
            <Segmented
              aria-label="Urgenza"
              value={priority}
              onValueChange={setPriority}
              options={meta.priorities.map((p) => ({
                value: p,
                label: (
                  <span className="inline-flex items-center gap-1.5">
                    <span className="h-3 w-1 rounded-full" style={{ background: priorityVar(p) }} />
                    {p}
                  </span>
                ),
              }))}
            />
          </Field>
          <Field
            label="Motivo"
            htmlFor="reason"
            hint="resta nella storia della richiesta"
            error={tried && reason.trim().length < 3 ? "Scrivi perché confermi o correggi." : undefined}
          >
            <div className="mb-1 flex flex-wrap gap-1.5">
              {REASONS.map((rs) => (
                <button
                  key={rs}
                  type="button"
                  onClick={() => setReason(rs)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    reason === rs
                      ? "border-primary bg-primary-soft text-ink"
                      : "border-line-strong text-muted hover:border-ink/40 hover:text-ink",
                  )}
                >
                  {rs}
                </button>
              ))}
            </div>
            <Input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Oppure scrivi il motivo"
              aria-invalid={tried && reason.trim().length < 3}
            />
          </Field>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-line pt-5">
          <p className="mr-auto text-sm text-muted">
            {changed ? "Stai correggendo la proposta." : "Confermi la proposta così com'è."}
          </p>
          <Button size="lg" onClick={save} disabled={review.isPending}>
            {changed ? "Salva correzione" : "Conferma proposta"}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
