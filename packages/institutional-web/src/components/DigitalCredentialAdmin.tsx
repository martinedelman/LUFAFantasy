"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { getLufaAppUrl } from "@lufa/api-client/authUrls";
import type { DigitalCredentialCandidateResponseDto, DigitalCredentialResponseDto, DigitalCredentialRole, IssueOfficialCredentialRequestDto } from "@lufa/contracts";

type Candidate = DigitalCredentialCandidateResponseDto;
type Credential = DigitalCredentialResponseDto;
type SearchType = "player" | "official";
type Selection = Candidate | "manual";
type ApiPayload<T> = { success?: boolean; data?: T; message?: string };

const api = "/api/admin/digital-credentials";
const panel = "space-y-4 rounded-lg border border-slate-200 bg-white p-5";
const input = "w-full rounded-md border border-slate-300 px-3 py-2.5 text-sm focus-visible:outline-2 focus-visible:outline-brand-700 disabled:bg-slate-100";
const button = "rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-brand-700 disabled:opacity-50";
const primaryButton = "rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 disabled:opacity-50";
const sourceLabels: Record<Candidate["source"], string> = {
  player: "Ficha de jugador", judge: "Ficha de juez", coach: "Entrenador de equipo",
  account: "Cuenta LUFA", credential: "ID Digital emitida",
};
const roleOptions: { value: DigitalCredentialRole; label: string; aliases: string[] }[] = [
  { value: "player", label: "Jugador", aliases: ["jugador", "jugadora", "player"] },
  { value: "judge", label: "Juez", aliases: ["juez", "judge", "árbitro", "arbitro", "referee"] },
  { value: "coach", label: "Entrenador", aliases: ["entrenador", "entrenadora", "coach"] },
];

class RequestError extends Error {
  constructor(message: string, readonly credentials: Credential[]) {
    super(message);
  }
}

async function request<T>(path = "", init?: RequestInit): Promise<T> {
  const response = await fetch(`${api}${path}`, {
    cache: "no-store",
    ...init,
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
  });
  const payload = await response.json().catch(() => ({})) as ApiPayload<T>;
  if (!response.ok || !payload.success) {
    const data = payload.data as { credentials?: Credential[] } | undefined;
    throw new RequestError(payload.message || "No pudimos completar la operación.", data?.credentials ?? []);
  }
  return payload.data as T;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "No pudimos completar la operación.";
}

function ShareCredential({ credential }: { credential: Credential }) {
  const url = `${getLufaAppUrl()}/verificar/${encodeURIComponent(credential.publicId)}`;
  const [copyStatus, setCopyStatus] = useState("");
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyStatus("Enlace copiado.");
    } catch {
      setCopyStatus("No pudimos copiarlo. Abrí el enlace para copiar la dirección.");
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className={button} href={url} target="_blank" rel="noreferrer">Abrir verificación y QR</a>
      <button type="button" className={button} onClick={() => void copy()}>Copiar enlace</button>
      <span role="status" className="text-sm text-slate-600">{copyStatus}</span>
    </div>
  );
}

function CredentialForm({ selection, credential, busy, save }: {
  selection: Selection;
  credential?: Credential;
  busy: boolean;
  save: (path: string, method: "POST" | "PATCH", payload: object) => Promise<void>;
}) {
  const candidate = selection === "manual" ? null : selection;
  const player = candidate?.source === "player";
  const canSetPlayer = player || credential?.subjectType === "player";
  const existingLabels = credential?.roleLabel.toLowerCase().split(/[,;/|·]/).map((label) => label.trim());
  const initialRoles = roleOptions.filter(({ value, aliases }) =>
    existingLabels ? aliases.some((alias) => existingLabels.includes(alias)) : value === candidate?.source,
  ).map(({ value }) => value);
  const [roles, setRoles] = useState<DigitalCredentialRole[]>(initialRoles);
  const canIssue = !player || candidate.hasActiveAccount;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roles.length || busy || (!credential && !canIssue)) return;
    if (credential) {
      void save(`/${credential.id}`, "PATCH", {
        action: "set-roles", roles,
        ...(player && credential.subjectType !== "player" && roles.includes("player") ? { playerId: candidate.id } : {}),
      });
      return;
    }
    if (player) {
      void save("/issue-player", "POST", { playerId: candidate.id, roles });
      return;
    }
    const data = new FormData(event.currentTarget);
    const field = (key: string) => String(data.get(key) ?? "").trim();
    const payload: IssueOfficialCredentialRequestDto = {
      ...(candidate?.source === "account" ? { userId: candidate.id } : {}),
      ...(candidate?.source === "judge" ? { judgeId: candidate.id } : {}),
      email: field("email"), displayName: field("name"), organizationName: field("organization"),
      nationalityCode: field("nationality").toUpperCase(), dateOfBirth: field("birthDate"), roles,
    };
    void save("/issue-official", "POST", payload);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {!credential && !player && (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1 text-sm font-medium">Nombre completo
            <input name="name" className={input} defaultValue={candidate?.fullName} autoComplete="off" required />
          </label>
          <label className="space-y-1 text-sm font-medium">Correo de vinculación
            <input type="email" name="email" className={input} defaultValue={candidate?.email ?? ""}
              readOnly={candidate?.source === "account"} aria-describedby="credential-email-help" required />
            <span id="credential-email-help" className="block font-normal text-slate-600">Se vincula al verificar este correo en LUFA.</span>
          </label>
          <label className="space-y-1 text-sm font-medium">Equipo o asociación
            <input name="organization" className={input} defaultValue={candidate?.source === "coach" ? candidate.detail ?? "LUFA" : "LUFA"} required />
          </label>
          <label className="space-y-1 text-sm font-medium">Nacionalidad (código de dos letras)
            <input name="nationality" className={input} defaultValue="UY" pattern="[A-Za-z]{2}" maxLength={2} required />
          </label>
          <label className="space-y-1 text-sm font-medium">Fecha de nacimiento
            <input type="date" name="birthDate" className={input} max={new Date().toISOString().slice(0, 10)} required />
          </label>
        </div>
      )}
      <fieldset className="space-y-2" disabled={busy}>
        <legend className="text-sm font-semibold text-slate-950">Roles certificados</legend>
        <div className="flex flex-wrap gap-3">
          {roleOptions.filter(({ value }) => value !== "player" || canSetPlayer).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={roles.includes(value)} onChange={(event) => {
                const checked = event.target.checked;
                setRoles((current) => checked ? [...current, value] : current.filter((role) => role !== value));
              }} />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      {!credential && !canIssue && <p className="text-sm text-amber-800">Para emitir desde esta ficha, vinculala a una cuenta LUFA activa con el mismo correo.</p>}
      <button type="submit" className={primaryButton} disabled={busy || !roles.length || (!credential && !canIssue)}>
        {busy ? "Guardando…" : credential ? "Guardar roles" : "Emitir ID digital"}
      </button>
    </form>
  );
}

export default function DigitalCredentialAdmin() {
  const [type, setType] = useState<SearchType>("player");
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<{ key: string; rows: Candidate[]; error?: string }>();
  const [selected, setSelected] = useState<Selection | null>(null);
  const selectedHeading = useRef<HTMLHeadingElement>(null);
  const [related, setRelated] = useState<Credential[]>([]);
  const [recent, setRecent] = useState<Credential[]>();
  const [recentError, setRecentError] = useState("");
  const [revision, setRevision] = useState(0);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean }>();
  const query = search.trim();
  const searchKey = JSON.stringify([type, query, revision]);
  const currentResults = results?.key === searchKey ? results : undefined;

  useEffect(() => { if (selected) selectedHeading.current?.focus(); }, [selected]);

  useEffect(() => {
    const controller = new AbortController();
    void request<{ credentials: Credential[] }>("", { signal: controller.signal })
      .then(({ credentials }) => { if (!controller.signal.aborted) setRecent(credentials); })
      .catch((error) => { if (!controller.signal.aborted) setRecentError(errorMessage(error)); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ type, search: query });
      void request<Candidate[]>(`/candidates?${params}`, { signal: controller.signal })
        .then((rows) => { if (!controller.signal.aborted) setResults({ key: searchKey, rows }); })
        .catch((error) => {
          if (!controller.signal.aborted) setResults({ key: searchKey, rows: [], error: errorMessage(error) });
        });
    }, 250);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [query, searchKey, type]);

  function select(selection: Selection | null) {
    setSelected(selection);
    setRelated(selection && selection !== "manual" ? selection.credentials : []);
    setNotice(undefined);
  }

  async function save(path: string, method: "POST" | "PATCH", payload: object) {
    setBusy(true);
    setNotice(undefined);
    try {
      const credential = await request<Credential | undefined>(path, { method, body: JSON.stringify(payload) });
      if (credential) setRelated([credential]);
      else setRelated((current) => current.filter((item) => `/${item.id}` !== path));
      setNotice({ text: credential ? (method === "POST" ? `ID emitida · ${credential.memberNumber}` : "Roles actualizados.") : "ID revocada." });
      setRecentError("");
      setRevision((value) => value + 1);
    } catch (error) {
      if (error instanceof RequestError && error.credentials.length) setRelated(error.credentials);
      setNotice({ text: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  const credential = related.length === 1 ? related[0] : undefined;
  const selectedName = selected === "manual" ? "Cargar oficial" : selected?.fullName;

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-sky-100 bg-sky-50 p-5">
        <h2 className="text-2xl font-bold text-slate-950">ID Digital</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Buscá una persona para emitir su credencial oficial o actualizar los roles certificados.</p>
      </header>

      <section className={panel}>
        <fieldset className="flex flex-wrap gap-3" disabled={busy}>
          <legend className="mb-2 text-sm font-semibold text-slate-950">Buscar en</legend>
          {([["player", "Jugadores"], ["official", "Jueces, entrenadores y cuentas"]] as const).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <input type="radio" name="credential-search-type" checked={type === value} onChange={() => { setType(value); select(null); }} />
              {label}
            </label>
          ))}
        </fieldset>
        <label className="block space-y-1 text-sm font-semibold text-slate-950">
          Nombre o apellido
          <input type="search" className={input} value={search} disabled={busy} maxLength={120} placeholder="Ej. Sofía Rodríguez"
            onChange={(event) => setSearch(event.target.value)} />
        </label>
        <div role="status" className="text-sm text-slate-600">
          {query.length < 2 ? "Escribí al menos dos caracteres." : !currentResults ? "Buscando personas…" :
            currentResults.error ? "" : currentResults.rows.length ? `${currentResults.rows.length} coincidencias.` : "No encontramos personas con ese nombre."}
        </div>
        {currentResults?.error && <p role="alert" className="text-sm text-red-800">{currentResults.error}</p>}
        {Boolean(currentResults?.rows.length) && (
          <ul aria-label="Resultados de la búsqueda" className="divide-y divide-slate-200 rounded-md border border-slate-200">
            {currentResults?.rows.map((candidate) => (
              <li key={`${candidate.source}:${candidate.id}`}>
                <button type="button" disabled={busy} className="w-full px-3 py-2.5 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-brand-700"
                  onClick={() => select(candidate)}>
                  <span className="block text-sm font-semibold text-slate-950">{candidate.fullName}</span>
                  <span className="block break-words text-sm text-slate-600">
                    {[sourceLabels[candidate.source], candidate.detail, candidate.email].filter(Boolean).join(" · ")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {type === "official" && <button type="button" className={button} disabled={busy} onClick={() => select("manual")}>Cargar oficial manualmente</button>}
      </section>

      {selected && (
        <section className={panel} aria-labelledby="credential-selected-title">
          <h3 id="credential-selected-title" ref={selectedHeading} tabIndex={-1} className="scroll-mt-24 text-lg font-semibold text-slate-950">{selectedName}</h3>
          {notice && <p role={notice.error ? "alert" : "status"} className={notice.error ? "text-sm text-red-800" : "text-sm text-emerald-800"}>{notice.text}</p>}
          {related.length > 1 ? (
            <>
              <p className="text-sm text-amber-800">Hay más de una credencial vigente asociada. Verificá cuál corresponde antes de revocar una.</p>
              <ul className="space-y-3">
                {related.map((item) => (
                  <li key={item.id} className="space-y-2 rounded-md border border-slate-200 p-3">
                    <p className="text-sm font-medium">{item.displayName} · {item.memberNumber} · {item.roleLabel}</p>
                    <ShareCredential credential={item} />
                    <button type="button" className={button} disabled={busy} onClick={() => {
                      if (window.confirm(`¿Revocar la credencial ${item.memberNumber} de ${item.displayName}?`)) {
                        void save(`/${item.id}`, "PATCH", { action: "revoke" });
                      }
                    }}>Revocar esta credencial</button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              {credential && <>
                <p className="text-sm text-slate-600">{credential.displayName} · {credential.memberNumber} · {credential.roleLabel}</p>
                <ShareCredential key={credential.publicId} credential={credential} />
              </>}
              <CredentialForm key={credential ? `${credential.id}:${credential.roleLabel}` : `${selected === "manual" ? "manual" : selected.id}:${selected === "manual" ? "" : selected.source}`}
                selection={selected} credential={credential} busy={busy} save={save} />
            </>
          )}
        </section>
      )}

      <section className={panel}>
        <h3 className="font-semibold text-slate-950">Credenciales emitidas recientemente</h3>
        {recentError && <p role="alert" className="text-sm text-red-800">{recentError}</p>}
        {!recent && !recentError && <p className="text-sm text-slate-600">Cargando credenciales…</p>}
        {recent?.length === 0 && <p className="text-sm text-slate-600">Todavía no se emitieron credenciales.</p>}
        <ul className="divide-y divide-slate-100">
          {recent?.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-950">{item.displayName}</p>
                <p className="text-sm text-slate-600">{item.memberNumber} · {item.roleLabel} · {item.status === "active" ? "Vigente" : item.status === "revoked" ? "Revocada" : "Vencida"}</p>
                <p className="text-sm text-slate-600">Vencimiento {new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(item.expiresAt))}</p>
              </div>
              {item.status === "active" && <button className={button} type="button" disabled={busy} onClick={() => select({
                id: item.id, source: "credential", fullName: item.displayName, detail: item.memberNumber,
                email: null, hasActiveAccount: false, credentials: [item],
              })}>Gestionar ID</button>}
            </li>
          ))}
        </ul>
      </section>
    </section>
  );
}
