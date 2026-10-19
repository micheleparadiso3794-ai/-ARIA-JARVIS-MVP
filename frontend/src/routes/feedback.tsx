import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageHeader, Panel, PriorityTag } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { errorMessage, type FeedbackIn, type Priority, q, useCreateFeedback } from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/feedback")({ component: FeedbackPage });

const QUESTIONS: { key: keyof FeedbackIn; label: string }[] = [
  { key: "worked_well", label: "Cosa ha funzionato bene?" },
  { key: "unclear_aspects", label: "Cosa non era chiaro?" },
  { key: "errors_found", label: "Quali errori hai notato?" },
  { key: "suggested_improvements", label: "Cosa miglioreresti?" },
];

const EMPTY: FeedbackIn = {
  session_id: "",
  worked_well: "",
  unclear_aspects: "",
  errors_found: "",
  suggested_improvements: "",
  priority: "Media",
};

function FeedbackPage() {
  const list = useQuery(q.feedback());
  const create = useCreateFeedback();
  const [form, setForm] = useState<FeedbackIn>(EMPTY);
  const [tried, setTried] = useState(false);

  const set = <K extends keyof FeedbackIn>(k: K, v: FeedbackIn[K]) => setForm((f) => ({ ...f, [k]: v }));
  const empty = QUESTIONS.every((qq) => !(form[qq.key] as string).trim());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTried(true);
    if (!form.session_id.trim() || empty) return;
    create.mutate(form, {
      onSuccess: () => {
        toast.success("Feedback inviato. Grazie.");
        setForm({ ...EMPTY, session_id: form.session_id });
        setTried(false);
      },
      onError: (err) => toast.error(errorMessage(err)),
    });
  };

  return (
    <div>
      <PageHeader
        title="Feedback"
        description="Dopo aver provato il prototipo, racconta com'è andata. Bastano poche righe."
      />
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <Field
            label="Chi sei"
            htmlFor="session"
            hint="nome o sessione di prova"
            error={tried && !form.session_id.trim() ? "Scrivi il tuo nome o la sessione." : undefined}
          >
            <Input id="session" value={form.session_id} onChange={(e) => set("session_id", e.target.value)} />
          </Field>
          {QUESTIONS.map((qq) => (
            <Field key={qq.key} label={qq.label} htmlFor={qq.key}>
              <Textarea
                id={qq.key}
                className="min-h-20"
                value={form[qq.key] as string}
                onChange={(e) => set(qq.key, e.target.value)}
              />
            </Field>
          ))}
          {tried && empty && <p className="text-sm text-danger">Rispondi ad almeno una domanda.</p>}
          <Field label="Quanto è urgente intervenire?">
            <Segmented<Priority>
              aria-label="Urgenza dell'intervento"
              value={form.priority}
              onValueChange={(v) => set("priority", v)}
              options={(["Bassa", "Media", "Alta", "Critica"] as Priority[]).map((p) => ({ value: p, label: p }))}
            />
          </Field>
          <div>
            <Button type="submit" size="lg" disabled={create.isPending}>
              Invia feedback
            </Button>
          </div>
        </form>

        <section>
          <h2 className="mb-4 font-semibold">
            Raccolti <span className="tnum font-normal text-muted">{list.data?.length ?? 0}</span>
          </h2>
          {!list.data?.length ? (
            <p className="rounded-lg border border-dashed border-line-strong p-8 text-center text-muted">
              I feedback inviati compariranno qui.
            </p>
          ) : (
            <ul className="grid gap-3">
              {list.data.map((f) => (
                <li key={f.id}>
                <Panel className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium">{f.session_id}</p>
                    <span className="flex items-center gap-3 text-sm text-muted">
                      {formatDate(f.created_at)}
                      <PriorityTag priority={f.priority} />
                    </span>
                  </div>
                  <dl className="mt-3 grid gap-2 text-sm">
                    {QUESTIONS.filter((qq) => (f[qq.key] as string)?.trim()).map((qq) => (
                      <div key={qq.key}>
                        <dt className="text-muted">{qq.label}</dt>
                        <dd>{f[qq.key] as string}</dd>
                      </div>
                    ))}
                  </dl>
                </Panel>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
