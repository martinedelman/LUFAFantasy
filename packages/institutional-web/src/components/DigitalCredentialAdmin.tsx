"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";
import { getLufaAppUrl } from "@lufa/api-client/authUrls";
import {
  certificationLevels, membershipPaymentMethods,
  type AdminDigitalCredentialDetailDto, type CertificationInputDto, type CertificationLevel, type CertifiedRole, type DigitalCredentialCandidateResponseDto,
  type DigitalCredentialResponseDto, type DigitalCredentialRole, type DigitalCredentialRoleStatus, type DigitalCredentialStatus,
  type IssueOfficialCredentialRequestDto, type MembershipPaymentMethod,
} from "@lufa/contracts";

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

const statusLabels: Record<DigitalCredentialStatus, string> = {
  active: "Vigente", inactive: "Sin habilitaciones vigentes", suspended: "Miembro suspendido", revoked: "Revocada", expired: "Vencida", not_found: "No encontrada",
};
const roleStatusLabels: Record<DigitalCredentialRoleStatus, string> = {
  valid: "Habilitado", membership_required: "Membresía pendiente", pending_approval: "Pendiente de aprobación", player_inactive: "Ficha inactiva",
  team_inactive: "Equipo inactivo", certification_required: "Sin certificación", certification_expired: "Certificación vencida",
};
const roleNames: Record<DigitalCredentialRole, string> = { player: "Jugador", judge: "Juez", coach: "Entrenador" };
const methodLabels: Record<MembershipPaymentMethod, string> = { cash: "Efectivo", transfer: "Transferencia", team: "Cobrado por el equipo", other: "Otro" };
const levelLabel = (level: string) => level === "internacional" ? "Internacional" : `Nivel ${level}`;
const shortDate = (value: string) => new Intl.DateTimeFormat("es-UY", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
const seasonEnd = () => `${new Date().getUTCFullYear() + 1}-02-28`;

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
  const url = credential.verifyUrl || `${getLufaAppUrl()}/verificar/${encodeURIComponent(credential.publicId)}`;
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
  const initialRoles = credential ? credential.roles.map(({ role }) => role)
    : roleOptions.filter(({ value }) => value === candidate?.source).map(({ value }) => value);
  const [roles, setRoles] = useState<DigitalCredentialRole[]>(initialRoles);
  const [levels, setLevels] = useState<Record<CertifiedRole, CertificationLevel>>({ judge: "1", coach: "1" });
  const certifiedRoles = roles.filter((role): role is CertifiedRole => role !== "player");
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
    const data = new FormData(event.currentTarget);
    const field = (key: string) => String(data.get(key) ?? "").trim();
    if (player) {
      void save("/issue-player", "POST", { playerId: candidate.id, roles, nationalityCode: field("nationality").toUpperCase() });
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
      {!credential && player && (
        <label className="block max-w-xs space-y-1 text-sm font-medium">Nacionalidad (código de dos letras)
          <input name="nationality" className={input} defaultValue="UY" pattern="[A-Za-z]{2}" maxLength={2} required />
        </label>
      )}
      <fieldset className="space-y-2" disabled={busy}>
        <legend className="text-sm font-semibold text-slate-950">Roles</legend>
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
      {!credential && !player && certifiedRoles.length > 0 && (
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
                <input type="date" name={`expires-${role}`} className={input} defaultValue={seasonEnd()} min={new Date().toISOString().slice(0, 10)} />
              </label>
            </div>
          ))}
          {candidate?.source === "coach" && roles.includes("coach") && <p className="text-sm text-slate-600">Se vinculará como entrenador de {candidate.detail}.</p>}
        </fieldset>
      )}
      {!credential && !canIssue && <p className="text-sm text-amber-800">Para emitir desde esta ficha, vinculala a una cuenta LUFA activa con el mismo correo.</p>}
      <button type="submit" className={primaryButton} disabled={busy || !roles.length || (!credential && !canIssue)}>
        {busy ? "Guardando…" : credential ? "Guardar roles" : "Emitir ID digital"}
      </button>
    </form>
  );
}

function CredentialManager({ credential, busy, setBusy, onChanged }: {
  credential: Credential;
  busy: boolean;
  setBusy: (value: boolean) => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<AdminDigitalCredentialDetailDto>();
  const [message, setMessage] = useState<{ text: string; error?: boolean }>();
  const [teamSearch, setTeamSearch] = useState("");
  const [teams, setTeams] = useState<{ id: string; name: string; division: string }[]>([]);
  const path = `/${encodeURIComponent(credential.id)}`;

  useEffect(() => {
    const controller = new AbortController();
    void request<AdminDigitalCredentialDetailDto>(path, { signal: controller.signal })
      .then((data) => { if (!controller.signal.aborted) setDetail(data); })
      .catch((error) => { if (!controller.signal.aborted) setMessage({ text: errorMessage(error), error: true }); });
    return () => controller.abort();
  }, [path, credential.status, credential.roleLabel]);

  useEffect(() => {
    if (teamSearch.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void request<{ id: string; name: string; division: string }[]>(`/teams?${new URLSearchParams({ search: teamSearch.trim() })}`, { signal: controller.signal })
        .then((rows) => { if (!controller.signal.aborted) setTeams(rows); }).catch(() => undefined);
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [teamSearch]);

  async function act(suffix: string, method: "POST" | "PATCH", body: object, done: string) {
    setBusy(true);
    setMessage(undefined);
    try {
      await request(`${path}${suffix}`, { method, body: JSON.stringify(body) });
      setDetail(await request<AdminDigitalCredentialDetailDto>(path));
      setMessage({ text: done });
      onChanged();
    } catch (error) {
      setMessage({ text: errorMessage(error), error: true });
    } finally {
      setBusy(false);
    }
  }

  function recordPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = Number(data.get("amount") || 0);
    void act("/memberships", "POST", {
      method: data.get("method"), months: Number(data.get("months")), reference: String(data.get("reference") || "") || undefined,
      ...(amount > 0 ? { amountMinor: Math.round(amount * 100) } : {}),
    }, "Pago de membresía registrado.");
    event.currentTarget.reset();
  }

  function grantCertification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    void act("/certifications", "POST", { role: data.get("role"), level: data.get("level"), expiresAt: data.get("expiresAt") || undefined }, "Certificación otorgada.");
  }

  const current = detail?.credential ?? credential;
  const certifiedRoles = current.roles.map(({ role }) => role).filter((role): role is CertifiedRole => role !== "player");
  const hasPlayer = current.roles.some(({ role }) => role === "player");
  const hasCoach = certifiedRoles.includes("coach");
  const sectionTitle = "text-sm font-semibold text-slate-950";
  const row = "flex flex-col gap-1 border-t border-slate-100 py-2 text-sm sm:flex-row sm:items-center sm:justify-between";

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-slate-200 p-3">
        <p className="text-sm font-semibold text-slate-950">{current.displayName} · {current.lufaNumber} · Tarjeta {current.memberNumber}</p>
        <p className={`text-sm ${current.status === "active" ? "text-emerald-800" : "text-amber-800"}`}>
          {statusLabels[current.status]}{detail?.suspendedReason ? ` — ${detail.suspendedReason}` : ""}
        </p>
        <ul className="mt-2 flex flex-wrap gap-2">
          {current.roles.map((role) => (
            <li key={role.role} className={`rounded-full border px-3 py-1 text-xs font-semibold ${role.status === "valid" ? "border-emerald-200 bg-emerald-50 text-emerald-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
              {roleNames[role.role]}{role.level ? ` ${levelLabel(role.level)}` : ""}: {roleStatusLabels[role.status]}{role.validUntil && role.status === "valid" ? ` hasta ${shortDate(role.validUntil)}` : ""}
            </li>
          ))}
        </ul>
        <div className="mt-3"><ShareCredential credential={current} /></div>
      </div>
      {message && <p role={message.error ? "alert" : "status"} className={message.error ? "text-sm text-red-800" : "text-sm text-emerald-800"}>{message.text}</p>}

      {hasPlayer && (
        <section className="space-y-2" aria-label="Membresía">
          <h4 className={sectionTitle}>Membresía</h4>
          <p className="text-sm text-slate-600">El rol de jugador solo es válido mientras haya una membresía paga (tienda u offline).</p>
          {detail?.memberships.length === 0 && <p className="text-sm text-slate-600">Sin pagos registrados.</p>}
          <ul>
            {detail?.memberships.map((period) => (
              <li key={period.id} className={row}>
                <span className={period.status === "voided" ? "text-slate-400 line-through" : ""}>
                  {shortDate(period.startsAt)} → {shortDate(period.endsAt)} · {period.source === "store_order" ? "Tienda" : methodLabels[period.method as MembershipPaymentMethod] ?? period.method}
                  {period.reference ? ` · ${period.reference}` : ""}{period.amountMinor ? ` · $${(period.amountMinor / 100).toLocaleString("es-UY")}` : ""}
                </span>
                {period.status === "voided" ? <span className="text-slate-500">Anulado: {period.voidReason}</span> : period.source === "offline" && (
                  <button type="button" className={button} disabled={busy} onClick={() => {
                    const reason = window.prompt("Motivo de la anulación");
                    if (reason?.trim()) void act(`/memberships/${encodeURIComponent(period.id)}`, "PATCH", { action: "void", reason }, "Membresía anulada.");
                  }}>Anular</button>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={recordPayment} className="grid gap-3 sm:grid-cols-5">
            <label className="space-y-1 text-sm">Medio
              <select name="method" className={input} defaultValue="cash">{membershipPaymentMethods.map((method) => <option key={method} value={method}>{methodLabels[method]}</option>)}</select>
            </label>
            <label className="space-y-1 text-sm">Meses<input name="months" type="number" min={1} max={24} defaultValue={12} className={input} required /></label>
            <label className="space-y-1 text-sm">Monto UYU<input name="amount" type="number" min={0} step="0.01" className={input} /></label>
            <label className="space-y-1 text-sm">Referencia<input name="reference" maxLength={200} className={input} placeholder="Recibo, transferencia…" /></label>
            <button type="submit" className={`${primaryButton} self-end`} disabled={busy || current.status === "suspended"}>Registrar pago offline</button>
          </form>
        </section>
      )}

      {certifiedRoles.length > 0 && (
        <section className="space-y-2" aria-label="Certificaciones">
          <h4 className={sectionTitle}>Certificaciones</h4>
          {detail?.certifications.length === 0 && <p className="text-sm text-slate-600">Sin certificaciones: estos roles no están habilitados.</p>}
          <ul>
            {detail?.certifications.map((certification) => (
              <li key={certification.id} className={row}>
                <span className={certification.status === "revoked" ? "text-slate-400 line-through" : ""}>
                  {roleNames[certification.role]} · {levelLabel(certification.level)} · {certification.issuer} · vence {shortDate(certification.expiresAt)}
                </span>
                {certification.status === "active" && (
                  <button type="button" className={button} disabled={busy} onClick={() => {
                    if (window.confirm(`¿Revocar la certificación de ${roleNames[certification.role]}?`)) {
                      void act(`/certifications/${encodeURIComponent(certification.id)}`, "PATCH", { action: "revoke" }, "Certificación revocada.");
                    }
                  }}>Revocar</button>
                )}
              </li>
            ))}
          </ul>
          <form onSubmit={grantCertification} className="grid gap-3 sm:grid-cols-4">
            <label className="space-y-1 text-sm">Rol<select name="role" className={input}>{certifiedRoles.map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}</select></label>
            <label className="space-y-1 text-sm">Nivel<select name="level" className={input}>{certificationLevels.map((level) => <option key={level} value={level}>{levelLabel(level)}</option>)}</select></label>
            <label className="space-y-1 text-sm">Vence<input name="expiresAt" type="date" className={input} defaultValue={seasonEnd()} min={new Date().toISOString().slice(0, 10)} /></label>
            <button type="submit" className={`${primaryButton} self-end`} disabled={busy}>Otorgar certificación</button>
          </form>
        </section>
      )}

      {hasCoach && (
        <section className="space-y-2" aria-label="Equipos que dirige">
          <h4 className={sectionTitle}>Equipos que dirige</h4>
          <ul>
            {detail?.coachAssignments.map((assignment) => (
              <li key={assignment.id} className={row}>
                <span className={assignment.active ? "" : "text-slate-400"}>{assignment.teamName} · Temporada {assignment.season} · {assignment.role === "head" ? "Principal" : "Asistente"}</span>
                <button type="button" className={button} disabled={busy} onClick={() => void act(`/coach-assignments/${encodeURIComponent(assignment.id)}`, "PATCH", { active: !assignment.active }, assignment.active ? "Entrenador desvinculado." : "Vínculo reactivado.")}>
                  {assignment.active ? "Desvincular" : "Reactivar"}
                </button>
              </li>
            ))}
          </ul>
          <label className="block space-y-1 text-sm">Buscar equipo
            <input type="search" className={input} value={teamSearch} maxLength={80} onChange={(event) => setTeamSearch(event.target.value)} placeholder="Nombre del equipo" />
          </label>
          {teamSearch.trim().length >= 2 && teams.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
              {teams.map((team) => (
                <li key={team.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{team.name} · {team.division}</span>
                  <button type="button" className={button} disabled={busy} onClick={() => { void act("/coach-assignments", "POST", { teamId: team.id }, `Vinculado con ${team.name}.`); setTeamSearch(""); setTeams([]); }}>Vincular</button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <section className="space-y-2" aria-label="Miembro">
        <h4 className={sectionTitle}>Miembro LUFA</h4>
        <div className="flex flex-wrap items-end gap-3">
          <form className="flex items-end gap-2" onSubmit={(event) => {
            event.preventDefault();
            const value = String(new FormData(event.currentTarget).get("nationality") || "").toUpperCase();
            void act("", "PATCH", { action: "update-member", nationalityCode: value }, "Nacionalidad actualizada.");
          }}>
            <label className="space-y-1 text-sm">Nacionalidad
              <input key={current.nationalityCode} name="nationality" className={`${input} w-24`} defaultValue={current.nationalityCode} pattern="[A-Za-z]{2}" maxLength={2} required />
            </label>
            <button type="submit" className={button} disabled={busy}>Guardar</button>
          </form>
          {current.memberStatus === "suspended" ? (
            <button type="button" className={button} disabled={busy} onClick={() => void act("", "PATCH", { action: "reinstate" }, "Suspensión levantada.")}>Levantar suspensión</button>
          ) : (
            <button type="button" className={button} disabled={busy} onClick={() => {
              const reason = window.prompt("Motivo de la suspensión (bloquea todos los roles, aunque pague)");
              if (reason?.trim()) void act("", "PATCH", { action: "suspend", reason }, "Miembro suspendido.");
            }}>Suspender miembro</button>
          )}
        </div>
      </section>
    </div>
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
                    <p className="text-sm font-medium">{item.displayName} · {item.lufaNumber} · {item.memberNumber} · {item.roleLabel}</p>
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
              {credential && <CredentialManager key={credential.id} credential={credential} busy={busy} setBusy={setBusy}
                onChanged={() => setRevision((value) => value + 1)} />}
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
                <p className="text-sm text-slate-600">{item.lufaNumber} · {item.memberNumber} · {item.roleLabel} · {statusLabels[item.status]}</p>
                <p className="text-sm text-slate-600">Vencimiento {new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(item.expiresAt))}</p>
              </div>
              {item.cardStatus === "active" && <button className={button} type="button" disabled={busy} onClick={() => select({
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
