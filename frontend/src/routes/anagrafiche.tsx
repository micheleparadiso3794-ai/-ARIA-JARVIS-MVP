import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, PageHeader, Panel, StatusTag } from "@/components/domain";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import {
  errorMessage,
  q,
  useSeedOrganizations,
  useUpdateOrganization,
  type OrganizationInput,
  type PartyKind,
} from "@/lib/api";
import { formatDate } from "@/lib/utils";

export const Route = createFileRoute("/anagrafiche")({ component: Directory });

function Directory() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState<"Tutte" | PartyKind>("Tutte");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const parties = useQuery(q.organizations(search, kind === "Tutte" ? undefined : kind));
  const selected = parties.data?.find((party) => party.id === selectedId);
  const history = useQuery({ ...q.organizationHistory(selectedId ?? 0), enabled: selectedId !== null });
  const update = useUpdateOrganization();
  const seed = useSeedOrganizations();
  const [form, setForm] = useState<OrganizationInput | null>(null);

  useEffect(() => {
    if (selected) {
      const { id: _id, created_at: _created, ...values } = selected;
      setForm(values);
    }
  }, [selected]);

  const set = <K extends keyof OrganizationInput>(key: K, value: OrganizationInput[K]) =>
    setForm((current) => current && ({ ...current, [key]: value }));

  return (
    <div>
      <PageHeader title="Anagrafiche" description="Clienti e fornitori con recapiti, note operative e richieste precedenti." />
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <label className="relative block w-full max-w-md">
          <span className="sr-only">Cerca anagrafica</span>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca nome, codice, email o partita IVA" className="pl-9" />
        </label>
        <div className="flex flex-wrap gap-2">
          <Select value={kind} onValueChange={(value) => setKind(value as "Tutte" | PartyKind)} options={["Tutte", "Cliente", "Fornitore"]} />
          <Button variant="secondary" disabled={seed.isPending} onClick={() => seed.mutate(undefined, {
            onSuccess: (result) => toast.success("Dati dimostrativi pronti", { description: `${result.organizations} anagrafiche e ${result.requests} richieste storiche.` }),
            onError: (err) => toast.error(errorMessage(err)),
          })}>Carica dati demo</Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.5fr)]">
        <Panel className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <h2 className="font-medium">Rubrica</h2>
            <span className="text-sm text-muted">{parties.data?.length ?? 0}</span>
          </div>
          {parties.data?.length ? (
            <ul className="max-h-[70vh] overflow-y-auto">
              {parties.data.map((party) => (
                <li key={party.id} className="border-b border-line last:border-0">
                  <button type="button" onClick={() => { setSelectedId(party.id); setSearch(party.name); }}
                    aria-current={selectedId === party.id} className="flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-surface-2 aria-current:bg-primary-soft">
                    <Building2 className="mt-1 size-4 shrink-0 text-primary" />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{party.name}</span>
                      <span className="block text-xs text-muted">{party.kind} · {party.contact_name ?? party.customer_code ?? "Referente non indicato"}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 text-sm text-muted">Nessuna anagrafica corrispondente. Puoi crearla dalla schermata “Nuova richiesta”.</div>
          )}
        </Panel>

        {!selected || !form ? (
          <EmptyState icon={<Users />} title="Seleziona un’anagrafica">Qui trovi recapiti e storico delle richieste del soggetto selezionato.</EmptyState>
        ) : (
          <div className="grid gap-6">
            <Panel className="p-5">
              <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">{selected.kind} · scheda anagrafica n. {selected.id}</p>
                  <h2 className="mt-1 text-xl font-semibold">{selected.name}</h2>
                </div>
                <span className="rounded-full bg-surface-2 px-3 py-1 text-sm text-muted">{history.data?.requests.length ?? 0} richieste</span>
              </div>
              <form className="grid gap-4 sm:grid-cols-2" onSubmit={(event) => {
                event.preventDefault();
                update.mutate({ id: selected.id, ...form }, {
                  onSuccess: () => toast.success("Anagrafica aggiornata"),
                  onError: (err) => toast.error(errorMessage(err)),
                });
              }}>
                <Field label="Ragione sociale"><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
                <Field label="Tipo"><Select value={form.kind} onValueChange={(value) => set("kind", value as PartyKind)} options={["Cliente", "Fornitore"]} /></Field>
                <Field label="Partita IVA"><Input value={form.tax_id ?? ""} onChange={(e) => set("tax_id", e.target.value || null)} /></Field>
                <Field label="Codice cliente/fornitore"><Input value={form.customer_code ?? ""} onChange={(e) => set("customer_code", e.target.value || null)} /></Field>
                <Field label="Referente"><Input value={form.contact_name ?? ""} onChange={(e) => set("contact_name", e.target.value || null)} /></Field>
                <Field label="Email"><Input type="email" value={form.email ?? ""} onChange={(e) => set("email", e.target.value || null)} /></Field>
                <Field label="Telefono"><Input value={form.phone ?? ""} onChange={(e) => set("phone", e.target.value || null)} /></Field>
                <Field label="Sede"><Input value={form.address ?? ""} onChange={(e) => set("address", e.target.value || null)} /></Field>
                <Field label="Note operative" className="sm:col-span-2"><Textarea value={form.notes ?? ""} onChange={(e) => set("notes", e.target.value || null)} /></Field>
                <div className="sm:col-span-2"><Button type="submit" disabled={update.isPending}>Salva anagrafica</Button></div>
              </form>
            </Panel>

            <Panel className="p-5">
              <h3 className="mb-4 font-semibold">Storico richieste</h3>
              {history.data?.requests.length ? (
                <ol className="grid gap-4">
                  {history.data.requests.map((request) => (
                    <li key={request.id} className="rounded-md border border-line p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div><p className="font-medium">{request.title}</p><p className="mt-1 text-xs text-muted">{formatDate(request.created_at)} · {request.final_category} · {request.final_role}</p></div>
                        <StatusTag status={request.status} />
                      </div>
                      <p className="mt-3 text-sm text-muted">{request.description}</p>
                      {request.activities.length > 0 && <ul className="mt-3 grid gap-2 border-t border-line pt-3">
                        {request.activities.map((activity) => <li key={activity.id} className="text-sm">
                          <span className="font-medium">{activity.kind} · {activity.actor}:</span> <span className="text-muted">{activity.note}</span>
                          {activity.due_at && <span className="ml-1 text-xs text-primary">Promemoria {formatDate(activity.due_at)}</span>}
                        </li>)}
                      </ul>}
                    </li>
                  ))}
                </ol>
              ) : <p className="text-sm text-muted">Non ci sono ancora richieste associate.</p>}
            </Panel>
          </div>
        )}
      </div>
    </div>
  );
}
