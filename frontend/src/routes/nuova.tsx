import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { AlertTriangle, CornerDownLeft, ShieldCheck } from "lucide-react";
import { useDeferredValue, useEffect, useState } from "react";
import { toast } from "sonner";
import { Confidence, Highlighted, Panel, PriorityTag } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Segmented } from "@/components/ui/segmented";
import { Select } from "@/components/ui/select";
import {
  errorMessage,
  previewTriage,
  q,
  useCreateOrganization,
  useCreateRequest,
  useSeedOrganizations,
  type PartyKind,
  type Variant,
} from "@/lib/api";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/nuova")({
  loader: ({ context }) => context.queryClient.ensureQueryData(q.meta()),
  component: NewRequest,
});

const EXAMPLES = [
  { title: "Inverter in blocco al campo A1", description: "L'inverter è in blocco totale e si vede del fumo." },
  { title: "Fattura 405 con IVA errata", description: "Chiediamo nota credito e storno: aliquota sbagliata." },
  { title: "VPN non si collega", description: "Da stamattina non riesco ad accedere al server da casa." },
];

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function NewRequest() {
  const navigate = useNavigate();
  const meta = useQuery(q.meta()).data!;
  const create = useCreateRequest();
  const createOrganization = useCreateOrganization();
  const seedOrganizations = useSeedOrganizations();
  const [partyKind, setPartyKind] = useState<PartyKind>("Cliente");
  const [partySearch, setPartySearch] = useState("");
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [newParty, setNewParty] = useState(false);
  const [partyName, setPartyName] = useState("");
  const [partyTaxId, setPartyTaxId] = useState("");
  const [partyCode, setPartyCode] = useState("");
  const [partyEmail, setPartyEmail] = useState("");
  const [partyPhone, setPartyPhone] = useState("");
  const [partyAddress, setPartyAddress] = useState("");
  const [partyContact, setPartyContact] = useState("");
  const [partyNotes, setPartyNotes] = useState("");
  const organizations = useQuery(q.organizations(partySearch, partyKind));
  const selectedParty = organizations.data?.find((org) => org.id === organizationId);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [channel, setChannel] = useState(meta.channels[0]);
  const [userCategory, setUserCategory] = useState("");
  const [userUrgency, setUserUrgency] = useState("");
  const [notes, setNotes] = useState("");
  const [variant, setVariant] = useState<Variant>(meta.default_variant);
  const [touched, setTouched] = useState(false);

  const debounced = useDebounced({ title, description, variant }, 220);
  const hasText = (debounced.title + debounced.description).trim().length > 2;
  const preview = useQuery({
    queryKey: ["preview", debounced],
    queryFn: () => previewTriage(debounced),
    enabled: hasText,
    placeholderData: keepPreviousData,
    staleTime: Infinity,
  });
  const result = useDeferredValue(hasText ? preview.data : undefined);

  const titleError = touched && title.trim().length < 3 ? "Scrivi un titolo di almeno 3 caratteri." : undefined;
  const descError =
    touched && description.trim().length < 3 ? "Descrivi il problema in almeno 3 caratteri." : undefined;

  const reset = () => {
    setTitle("");
    setDescription("");
    setNotes("");
    setUserCategory("");
    setUserUrgency("");
    setOrganizationId(null);
    setPartySearch("");
    setNewParty(false);
    setPartyName("");
    setPartyTaxId("");
    setPartyCode("");
    setPartyEmail("");
    setPartyPhone("");
    setPartyAddress("");
    setPartyContact("");
    setPartyNotes("");
    setTouched(false);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (title.trim().length < 3 || description.trim().length < 3) return;
    if (!organizationId) {
      toast.error("Seleziona o crea l’anagrafica del cliente o fornitore.");
      return;
    }
    create.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        channel,
        user_category: userCategory || undefined,
        user_urgency: userUrgency || undefined,
        notes: notes || undefined,
        variant,
        organization_id: organizationId ?? undefined,
      },
      {
        onSuccess: (r) => {
          toast.success(`Richiesta n. ${r.id} registrata`, {
            description: r.needs_review ? "È in coda per la revisione." : `Assegnata a ${r.pred_role}.`,
            action: r.needs_review
              ? { label: "Revisiona", onClick: () => navigate({ to: "/revisione", search: { id: r.id } }) }
              : undefined,
          });
          reset();
        },
        onError: (err) => toast.error(errorMessage(err)),
      },
    );
  };

  return (
    <div>
      <header className="mb-8 max-w-2xl">
        <h1 className="text-2xl font-semibold tracking-[-0.01em]">Nuova richiesta</h1>
        <p className="mt-2 text-muted">
          Mentre scrivi, il sistema propone reparto, urgenza e responsabile. La proposta passa poi a una persona per
          la conferma.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <form onSubmit={submit} className="grid gap-5" noValidate>
          <section className="grid gap-4 rounded-lg border border-line bg-surface p-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-semibold">Cliente o fornitore</h2>
                <p className="mt-1 text-sm text-muted">Collega l’anagrafica corretta per rendere subito disponibile il suo storico.</p>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => seedOrganizations.mutate(undefined, {
                onSuccess: (result) => {
                  toast.success("Dati dimostrativi pronti", { description: `${result.organizations} anagrafiche e ${result.requests} richieste storiche aggiunte.` });
                  setPartySearch("demo");
                },
                onError: (err) => toast.error(errorMessage(err)),
              })} disabled={seedOrganizations.isPending}>
                Carica esempi
              </Button>
            </div>
            {selectedParty ? (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-primary-soft p-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{selectedParty.kind}</p>
                  <p className="font-medium">{selectedParty.name}</p>
                  <p className="text-sm text-muted">{selectedParty.contact_name ?? "Referente non indicato"} · {selectedParty.email ?? selectedParty.customer_code ?? "Nessun recapito"}</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setOrganizationId(null)}>Rimuovi</Button>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
                  <Field label="Tipo soggetto">
                    <Segmented aria-label="Tipo soggetto" value={partyKind} onValueChange={setPartyKind}
                      options={[{ value: "Cliente", label: "Cliente" }, { value: "Fornitore", label: "Fornitore" }]} />
                  </Field>
                  <Field label="Cerca anagrafica" hint="nome, email, codice o partita IVA">
                    <Input value={partySearch} onChange={(e) => { setPartySearch(e.target.value); setNewParty(false); }} placeholder="Es. Alfa Energia" />
                  </Field>
                </div>
                {partySearch.trim().length >= 2 && (organizations.data?.length ?? 0) > 0 && (
                  <ul className="grid gap-1" aria-label="Risultati anagrafica">
                    {organizations.data?.slice(0, 6).map((org) => (
                      <li key={org.id}>
                        <button type="button" onClick={() => { setOrganizationId(org.id); setPartySearch(org.name); }} className="w-full rounded-md border border-line px-3 py-2 text-left hover:bg-surface-2">
                          <span className="font-medium">{org.name}</span><span className="ml-2 text-sm text-muted">{org.kind} · {org.contact_name ?? org.customer_code ?? org.email ?? ""}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {!newParty ? (
                  <Button type="button" variant="secondary" onClick={() => { setNewParty(true); setPartyName(partySearch.trim()); }}>
                    Crea nuova anagrafica {partyKind.toLowerCase()}
                  </Button>
                ) : (
                  <div className="grid gap-3 rounded-md border border-line p-3">
                    <p className="text-sm font-medium">Nuova anagrafica {partyKind.toLowerCase()}</p>
                    <Field label="Nome azienda"><Input value={partyName} onChange={(e) => setPartyName(e.target.value)} placeholder="Ragione sociale" /></Field>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Partita IVA" hint="facoltativa"><Input value={partyTaxId} onChange={(e) => setPartyTaxId(e.target.value)} /></Field>
                      <Field label="Codice cliente/fornitore" hint="facoltativo"><Input value={partyCode} onChange={(e) => setPartyCode(e.target.value)} /></Field>
                      <Field label="Referente"><Input value={partyContact} onChange={(e) => setPartyContact(e.target.value)} /></Field>
                      <Field label="Email"><Input type="email" value={partyEmail} onChange={(e) => setPartyEmail(e.target.value)} /></Field>
                      <Field label="Telefono"><Input value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} /></Field>
                      <Field label="Sede"><Input value={partyAddress} onChange={(e) => setPartyAddress(e.target.value)} /></Field>
                      <Field label="Note operative"><Input value={partyNotes} onChange={(e) => setPartyNotes(e.target.value)} /></Field>
                    </div>
                    <div className="flex gap-2">
                      <Button type="button" disabled={createOrganization.isPending || partyName.trim().length < 2} onClick={() => createOrganization.mutate({
                        kind: partyKind, name: partyName, tax_id: partyTaxId || null, customer_code: partyCode || null,
                        email: partyEmail || null, phone: partyPhone || null, contact_name: partyContact || null,
                        address: partyAddress || null, notes: partyNotes || null,
                      }, {
                        onSuccess: (org) => { setOrganizationId(org.id); setPartySearch(org.name); setNewParty(false); toast.success("Anagrafica creata e collegata"); },
                        onError: (err) => toast.error(errorMessage(err)),
                      })}>Crea e collega</Button>
                      <Button type="button" variant="ghost" onClick={() => setNewParty(false)}>Annulla</Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </section>
          <Field label="Titolo" htmlFor="title" error={titleError}>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Es. Guasto inverter al cantiere nord"
              aria-invalid={!!titleError}
              autoFocus
              autoComplete="off"
            />
          </Field>
          <Field label="Cosa succede" htmlFor="description" error={descError}>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrivi il problema o la richiesta con parole tue."
              aria-invalid={!!descError}
              className="min-h-40"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit(e);
              }}
            />
          </Field>

          {!title && !description && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-muted">Prova con:</span>
              {EXAMPLES.map((ex) => (
                <button
                  key={ex.title}
                  type="button"
                  onClick={() => {
                    setTitle(ex.title);
                    setDescription(ex.description);
                  }}
                  className="rounded-full border border-line-strong px-3 py-1 text-ink hover:border-primary hover:text-primary"
                >
                  {ex.title}
                </button>
              ))}
            </div>
          )}

          <Field label="Arrivata da">
            <Segmented
              aria-label="Canale di arrivo"
              value={channel}
              onValueChange={setChannel}
              options={meta.channels.map((c) => ({ value: c, label: c }))}
            />
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Reparto indicato" hint="facoltativo" htmlFor="user-category">
              <Select
                id="user-category"
                value={userCategory}
                onValueChange={setUserCategory}
                options={meta.categories}
                placeholder="Non indicato"
              />
            </Field>
            <Field label="Urgenza indicata" hint="facoltativo" htmlFor="user-urgency">
              <Select
                id="user-urgency"
                value={userUrgency}
                onValueChange={setUserUrgency}
                options={meta.priorities}
                placeholder="Non indicata"
              />
            </Field>
          </div>

          <Field label="Note" hint="facoltativo" htmlFor="notes">
            <Input id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>

          <div className="flex flex-wrap items-center justify-between gap-4 border-t border-line pt-5">
            <Field label="Regole usate">
              <Segmented
                aria-label="Variante delle regole"
                value={variant}
                onValueChange={setVariant}
                options={(Object.keys(meta.variants) as Variant[]).map((v) => ({ value: v, label: meta.variants[v] }))}
              />
            </Field>
            <Button type="submit" size="lg" disabled={create.isPending}>
              Registra richiesta
              <kbd className="hidden items-center gap-0.5 rounded bg-white/15 px-1.5 text-xs sm:inline-flex">
                Ctrl <CornerDownLeft className="!size-3" />
              </kbd>
            </Button>
          </div>
        </form>

        <TriagePreview
          title={title}
          description={description}
          result={result}
          loading={preview.isFetching}
          empty={!hasText}
        />
      </div>
    </div>
  );
}

function TriagePreview({
  title,
  description,
  result,
  loading,
  empty,
}: {
  title: string;
  description: string;
  result: Awaited<ReturnType<typeof previewTriage>> | undefined;
  loading: boolean;
  empty: boolean;
}) {
  return (
    <Panel aria-live="polite" className="lg:sticky lg:top-8">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <h2 className="text-sm font-medium text-muted">Proposta del sistema</h2>
        <span
          className={cn("size-2 rounded-full bg-primary transition-opacity", loading ? "animate-pulse" : "opacity-0")}
          aria-hidden
        />
      </div>

      {empty || !result ? (
        <div className="px-5 py-10 text-center text-sm text-muted">
          Inizia a scrivere: qui compariranno reparto, urgenza e a chi va la richiesta.
        </div>
      ) : (
        <div className="grid gap-5 px-5 py-5">
          <div>
            <p className="text-sm text-muted">Reparto</p>
            <p
              key={result.pred_category}
              className="mt-0.5 text-xl font-semibold tracking-[-0.01em] animate-swap"
            >
              {result.pred_category}
            </p>
          </div>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-muted">Urgenza</dt>
              <dd className="mt-1">
                <PriorityTag priority={result.pred_priority} className="text-base" />
              </dd>
            </div>
            <div>
              <dt className="text-sm text-muted">Sicurezza</dt>
              <dd className="mt-1.5">
                <Confidence value={result.confidence} />
              </dd>
            </div>
            <div className="col-span-2">
              <dt className="text-sm text-muted">Va a</dt>
              <dd className="mt-0.5 font-medium">{result.pred_role}</dd>
            </div>
          </dl>

          {result.matches.length > 0 && (
            <div className="rounded-md bg-surface-2 p-3.5 text-sm leading-relaxed">
              <p className="font-medium">
                <Highlighted
                  text={title}
                  matches={result.matches}
                  priorityKeyword={result.priority_keyword}
                  focusCategory={result.pred_category}
                />
              </p>
              <p className="mt-1 text-muted">
                <Highlighted
                  text={description}
                  matches={result.matches}
                  priorityKeyword={result.priority_keyword}
                  focusCategory={result.pred_category}
                />
              </p>
            </div>
          )}

          <p className="text-sm text-muted text-pretty">{result.reasoning}</p>

          {result.ambiguous ? (
            <p className="flex gap-2 rounded-md bg-alta/10 p-3 text-sm text-ink">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-alta" />
              Il testo parla di più reparti. Una persona deciderà quale.
            </p>
          ) : (
            result.needs_review && (
              <p className="flex gap-2 text-sm text-muted">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                Andrà in revisione prima di essere assegnata.
              </p>
            )
          )}
        </div>
      )}
    </Panel>
  );
}
