"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import {
  certificationLevels,
  type CertificationInputDto, type CertificationLevel, type CertifiedRole, type DigitalCredentialCandidateResponseDto,
  type DigitalCredentialResponseDto, type DigitalCredentialRole, type IssueOfficialCredentialRequestDto,
} from "@lufa/contracts";
import DigitalCredentialManageModal from "./DigitalCredentialManageModal";
import {
  button, credentialRequest, errorMessage, input, levelLabel, panel, primaryButton, RequestError, roleNames, roleStatusLabels, seasonEnd,
  shortDate, statusLabels, today,
} from "./digitalCredentialAdminShared";

type Candidate = DigitalCredentialCandidateResponseDto;
type Credential = DigitalCredentialResponseDto;
type SearchType = "player" | "official";
type Selection = Candidate | "manual";

const sourceLabels: Record<Candidate["source"], string> = {
  player: "Ficha de jugador", judge: "Ficha de juez", coach: "Entrenador de equipo",
  account: "Cuenta LUFA", credential: "ID Digital emitida",
};
const roleOptions: { value: DigitalCredentialRole; label: string }[] = [
  { value: "player", label: "Jugador" },
  { value: "judge", label: "Juez" },
  { value: "coach", label: "Entrenador" },
];

/** Resumen de una ID con el estado de cada rol y el acceso a la gestión completa. */
function CredentialSummary({ credential, onManage, disabled }: { credential: Credential; onManage: () => void; disabled?: boolean }) {
  const tone = credential.status === "active" ? "text-emerald-800" : credential.status === "inactive" ? "text-amber-800" : "text-red-800";
  const usable = credential.status === "active" || credential.status === "inactive";
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="font-semibold text-slate-950">{credential.displayName}</p>
        <p className="text-sm text-slate-600">
          N.º LUFA {credential.lufaNumber} · Tarjeta {credential.memberNumber} · vence {shortDate(credential.expiresAt)} · <span className={`font-semibold ${tone}`}>{statusLabels[credential.status]}</span>
        </p>
        <ul className="flex flex-wrap gap-1.5" aria-label="Roles">
          {credential.roles.map((role) => (
            // Con la tarjeta revocada, vencida o el miembro suspendido, los roles no habilitan nada: se muestran neutros.
            <li key={role.role} className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${!usable ? "border-slate-200 bg-slate-50 text-slate-500" : role.status === "valid" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {roleNames[role.role]}{role.level ? ` ${levelLabel(role.level)}` : ""}{usable ? `: ${roleStatusLabels[role.status]}` : ""}
            </li>
          ))}
        </ul>
      </div>
      <button type="button" className={`${button} shrink-0`} disabled={disabled} onClick={onManage}>Gestionar ID</button>
    </div>
  );
}

/** Emisión de una ID nueva. La gestión de una ID existente se hace en el modal. */
function IssueCredentialForm({ selection, busy, issue }: {
  selection: Selection;
  busy: boolean;
  issue: (path: string, payload: object) => Promise<void>;
}) {
  const candidate = selection === "manual" ? null : selection;
  const player = candidate?.source === "player";
  const [roles, setRoles] = useState<DigitalCredentialRole[]>(roleOptions.filter(({ value }) => value === candidate?.source).map(({ value }) => value));
  const [levels, setLevels] = useState<Record<CertifiedRole, CertificationLevel>>({ judge: "1", coach: "1" });
  const certifiedRoles = roles.filter((role): role is CertifiedRole => role !== "player");
  const canIssue = !player || candidate.hasActiveAccount;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!roles.length || busy || !canIssue) return;
    const data = new FormData(event.currentTarget);
    const field = (key: string) => String(data.get(key) ?? "").trim();
    if (player) {
      void issue("/issue-player", { playerId: candidate.id, roles, nationalityCode: field("nationality").toUpperCase() });
      return;
    }
    const certifications: CertificationInputDto[] = certifiedRoles.map((role) => ({
      role, level: levels[role], expiresAt: field(`expires-${role}`) || undefined,
    }));
    const payload: IssueOfficialCredentialRequestDto = {
      ...(candidate?.source === "account" ? { userId: candidate.id } : {}),
      ...(candidate?.source === "judge" ? { judgeId: candidate.id } : {}),
      ...(candidate?.source === "coach" && roles.includes("coach") ? { teamId: candidate.id.split(":")[0] } : {}),
      certifications,
      email: field("email"), displayName: field("name"), organizationName: field("organization"),
      nationalityCode: field("nationality").toUpperCase(), dateOfBirth: field("birthDate"), roles,
    };
    void issue("/issue-official", payload);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <p className="text-sm text-slate-600">Esta persona todavía no tiene una ID vigente. Completá los datos para emitirla; después podés registrar pagos y certificaciones desde “Gestionar ID”.</p>
      {!player && (
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
            <input type="date" name="birthDate" className={input} max={today()} required />
          </label>
        </div>
      )}
      {player && (
        <label className="block max-w-xs space-y-1 text-sm font-medium">Nacionalidad (código de dos letras)
          <input name="nationality" className={input} defaultValue="UY" pattern="[A-Za-z]{2}" maxLength={2} required />
        </label>
      )}
      <fieldset className="space-y-2" disabled={busy}>
        <legend className="text-sm font-semibold text-slate-950">Roles</legend>
        <div className="flex flex-wrap gap-3">
          {roleOptions.filter(({ value }) => value !== "player" || player).map(({ value, label }) => (
            <label key={value} className="flex items-center gap-2 rounded-md border border-slate-200 px-3 py-2 text-sm">
              <input type="checkbox" checked={roles.includes(value)} onChange={(event) => {
                const checked = event.target.checked;
                setRoles((current) => checked ? [...current, value] : current.filter((role) => role !== value));
              }} />
              {label}
            </label>
          ))}
        </div>
        {roles.includes("player") && <p className="text-sm text-slate-600">El rol Jugador queda habilitado recién cuando haya una membresía paga.</p>}
      </fieldset>
      {!player && certifiedRoles.length > 0 && (
        <fieldset className="space-y-2" disabled={busy}>
          <legend className="text-sm font-semibold text-slate-950">Certificación virtual</legend>
          <p className="text-sm text-slate-600">Entrenadores y jueces solo quedan habilitados con una certificación vigente.</p>
          {certifiedRoles.map((role) => (
            <div key={role} className="grid gap-3 sm:grid-cols-3">
              <span className="self-center text-sm font-medium">{roleNames[role]}</span>
              <label className="space-y-1 text-sm">Nivel
                <select className={input} value={levels[role]} onChange={(event) => setLevels((current) => ({ ...current, [role]: event.target.value as CertificationLevel }))}>
                  {certificationLevels.map((level) => <option key={level} value={level}>{levelLabel(level)}</option>)}
                </select>
              </label>
              <label className="space-y-1 text-sm">Vence
                <input type="date" name={`expires-${role}`} className={input} defaultValue={seasonEnd()} min={today()} />
              </label>
            </div>
          ))}
          {candidate?.source === "coach" && roles.includes("coach") && <p className="text-sm text-slate-600">Se vinculará como entrenador de {candidate.detail}.</p>}
        </fieldset>
      )}
      {!canIssue && <p className="text-sm text-amber-800">Para emitir desde esta ficha, vinculala a una cuenta LUFA activa con el mismo correo.</p>}
      <button type="submit" className={primaryButton} disabled={busy || !roles.length || !canIssue}>
        {busy ? "Emitiendo…" : "Emitir ID digital"}
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
  const [managing, setManaging] = useState<{ id: string; linkPlayerId?: string | null } | null>(null);
  const query = search.trim();
  const searchKey = JSON.stringify([type, query, revision]);
  const currentResults = results?.key === searchKey ? results : undefined;

  useEffect(() => { if (selected) selectedHeading.current?.focus(); }, [selected]);

  useEffect(() => {
    const controller = new AbortController();
    void credentialRequest<{ credentials: Credential[] }>("", { signal: controller.signal })
      .then(({ credentials }) => { if (!controller.signal.aborted) setRecent(credentials); })
      .catch((error) => { if (!controller.signal.aborted) setRecentError(errorMessage(error)); });
    return () => controller.abort();
  }, [revision]);

  useEffect(() => {
    if (query.length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ type, search: query });
      void credentialRequest<Candidate[]>(`/candidates?${params}`, { signal: controller.signal })
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

  function manage(credential: Credential) {
    const linkPlayerId = selected && selected !== "manual" && selected.source === "player" ? selected.id : null;
    setManaging({ id: credential.id, linkPlayerId });
  }

  async function issue(path: string, payload: object) {
    setBusy(true);
    setNotice(undefined);
    try {
      const credential = await credentialRequest<Credential>(path, { method: "POST", body: JSON.stringify(payload) });
      setRelated([credential]);
      setNotice({ text: `ID emitida · N.º LUFA ${credential.lufaNumber} · Tarjeta ${credential.memberNumber}. Registrá el pago o la certificación para habilitarla.` });
      setRecentError("");
      setRevision((value) => value + 1);
      setManaging({ id: credential.id });
    } catch (error) {
      if (error instanceof RequestError && error.credentials.length) setRelated(error.credentials);
      setNotice({ text: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  /** Tras guardar en el modal: refresca la lista y la credencial mostrada (una renovación cambia la tarjeta). */
  function handleChanged(credential: Credential, previousId: string) {
    setRevision((value) => value + 1);
    setRelated((current) => current.map((item) => item.id === previousId || item.id === credential.id ? credential : item));
  }

  const selectedName = selected === "manual" ? "Cargar oficial" : selected?.fullName;

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-sky-100 bg-sky-50 p-5">
        <h2 className="text-2xl font-bold text-slate-950">ID Digital</h2>
        <p className="mt-2 text-sm leading-6 text-slate-700">Buscá una persona para emitir su credencial oficial, o abrí “Gestionar ID” para ver y cambiar sus roles, pagos de membresía, certificaciones y equipos.</p>
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
                    {[sourceLabels[candidate.source], candidate.detail, candidate.email, candidate.credentials.length ? "Tiene ID vigente" : null].filter(Boolean).join(" · ")}
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
          {related.length > 0 ? (
            <>
              {related.length > 1 && <p className="text-sm text-amber-800">Hay más de una credencial vigente asociada a esta persona. Abrí cada una y revocá la que no corresponda.</p>}
              <ul className="divide-y divide-slate-100">
                {related.map((item) => (
                  <li key={item.id} className="py-3 first:pt-0 last:pb-0">
                    <CredentialSummary credential={item} disabled={busy} onManage={() => manage(item)} />
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <IssueCredentialForm key={selected === "manual" ? "manual" : `${selected.source}:${selected.id}`} selection={selected} busy={busy} issue={issue} />
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
            <li key={item.id} className="py-3">
              <CredentialSummary credential={item} disabled={busy} onManage={() => setManaging({ id: item.id })} />
            </li>
          ))}
        </ul>
      </section>

      {managing && (
        <DigitalCredentialManageModal
          credentialId={managing.id}
          linkPlayerId={managing.linkPlayerId}
          onClose={() => setManaging(null)}
          onChanged={handleChanged}
        />
      )}
    </section>
  );
}
