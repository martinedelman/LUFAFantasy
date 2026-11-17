"use client";

import { type FormEvent, type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import { getLufaAppUrl } from "@lufa/api-client/authUrls";
import {
  certificationLevels, membershipPaymentMethods,
  type AdminDigitalCredentialDetailDto, type CertificationLevel, type CertifiedRole, type CredentialHistoryEntryDto,
  type DigitalCredentialResponseDto, type DigitalCredentialRole, type MembershipPaymentMethod,
} from "@lufa/contracts";
import {
  button, credentialRequest, dangerButton, dateTime, errorMessage, input, levelLabel, methodLabels, money, playerStatusLabels, primaryButton,
  roleNames, roleStatusHelp, roleStatusLabels, seasonEnd, shortDate, statusExplanations, statusLabels, today,
} from "./digitalCredentialAdminShared";

type Credential = DigitalCredentialResponseDto;
type Detail = AdminDigitalCredentialDetailDto;
type Tab = "summary" | "roles" | "membership" | "certifications" | "teams" | "member" | "history";
type Notice = { kind: "saved" | "error"; title: string; lines?: string[] };

const allRoles: DigitalCredentialRole[] = ["player", "judge", "coach"];
const certifiedRoleList: CertifiedRole[] = ["judge", "coach"];
const label = "space-y-1 text-sm font-medium text-slate-800";
const hint = "text-sm text-slate-600";
const table = "w-full min-w-[640px] text-left text-sm";
const th = "border-b border-slate-200 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-500";
const td = "border-b border-slate-100 px-3 py-2.5 align-top";

function Badge({ tone, children }: { tone: "ok" | "warn" | "bad" | "muted"; children: ReactNode }) {
  const tones = {
    ok: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warn: "border-amber-200 bg-amber-50 text-amber-800",
    bad: "border-red-200 bg-red-50 text-red-800",
    muted: "border-slate-200 bg-slate-50 text-slate-600",
  };
  return <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${tones[tone]}`}>{children}</span>;
}

/** Recuadro que muestra exactamente qué se va a guardar antes de confirmar. */
function SavePreview({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-950" aria-live="polite">
      <span className="font-semibold">Se guardará: </span>{children}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-base font-semibold text-slate-950">{title}</h3>
        {description && <p className={hint}>{description}</p>}
      </div>
      {children}
    </section>
  );
}

function paymentMethodLabel(method: string | null) {
  if (!method) return "—";
  if (method === "backfill") return "Migración (ID vigente al activar membresías)";
  return methodLabels[method as MembershipPaymentMethod] ?? method;
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setUTCMonth(result.getUTCMonth() + months);
  return result;
}

// El orden de las claves define el orden en que se muestran los detalles.
const historyKeyLabels: Record<string, string> = {
  roles: "Roles", role: "Rol", level: "Nivel", method: "Medio", startsAt: "Desde", endsAt: "Hasta", expiresAt: "Vence", amountMinor: "Monto",
  reference: "Referencia", season: "Temporada", active: "Activo", nationalityCode: "Nacionalidad", status: "Estado", reason: "Motivo", subjectType: "Tipo",
};

function historyDetails(details: CredentialHistoryEntryDto["details"]) {
  if (!details) return [];
  return Object.keys(historyKeyLabels).flatMap((key) => {
    const value = details[key];
    const name = historyKeyLabels[key];
    if (!name || value === null || value === undefined || value === "") return [];
    let text: string;
    if (Array.isArray(value)) text = value.map((item) => roleNames[item as DigitalCredentialRole] ?? String(item)).join(" · ");
    else if (key === "amountMinor" && typeof value === "number") text = money(value);
    else if (key === "method") text = paymentMethodLabel(String(value));
    else if (key === "role") text = roleNames[value as DigitalCredentialRole] ?? String(value);
    else if (key === "level") text = levelLabel(String(value));
    else if (key === "active") text = value ? "Sí" : "No";
    else if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}T/.test(value)) text = shortDate(value);
    else text = String(value);
    return [`${name}: ${text}`];
  });
}

export default function DigitalCredentialManageModal({ credentialId, linkPlayerId, onClose, onChanged }: {
  credentialId: string;
  /** Ficha de jugador elegida en la búsqueda, para poder sumar el rol Jugador a una credencial de oficial. */
  linkPlayerId?: string | null;
  onClose: () => void;
  /** Se llama con la credencial actualizada; previousId difiere cuando una renovación emitió una tarjeta nueva. */
  onChanged: (credential: Credential, previousId: string) => void;
}) {
  const [id, setId] = useState(credentialId);
  const [detail, setDetail] = useState<Detail>();
  const [loadError, setLoadError] = useState("");
  const [tab, setTab] = useState<Tab>("summary");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>();
  const heading = useRef<HTMLHeadingElement>(null);

  // Formularios controlados: así el recuadro "Se guardará" refleja lo que se envía.
  const [roles, setRoles] = useState<DigitalCredentialRole[]>([]);
  const [payment, setPayment] = useState<{ method: MembershipPaymentMethod; months: number; amount: string; reference: string }>({ method: "cash", months: 12, amount: "", reference: "" });
  const [certification, setCertification] = useState<{ role: CertifiedRole; level: CertificationLevel; issuer: string; expiresAt: string; notes: string }>({ role: "judge", level: "1", issuer: "LUFA", expiresAt: seasonEnd(), notes: "" });
  const [teamSearch, setTeamSearch] = useState("");
  const [teamResults, setTeamResults] = useState<{ id: string; name: string; division: string }[]>([]);
  const [newAssignment, setNewAssignment] = useState<{ teamId: string; teamName: string; season: number; role: "head" | "assistant" } | null>(null);
  const [nationality, setNationality] = useState("");
  const [suspendReason, setSuspendReason] = useState("");
  const [confirming, setConfirming] = useState<{ kind: "void" | "revoke-certification" | "revoke-card" | "renew-card"; id?: string; reason?: string } | null>(null);

  const load = useCallback(async (targetId: string) => {
    const data = await credentialRequest<Detail>(`/${encodeURIComponent(targetId)}`);
    setDetail(data);
    setRoles(data.credential.roles.map(({ role }) => role));
    setNationality(data.credential.nationalityCode);
    const certified = data.credential.roles.map(({ role }) => role).filter((role): role is CertifiedRole => role !== "player");
    setCertification((current) => certified.includes(current.role) || !certified[0] ? current : { ...current, role: certified[0] });
    return data;
  }, []);

  useEffect(() => {
    setLoadError("");
    load(id).catch((error) => setLoadError(errorMessage(error)));
  }, [id, load]);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    heading.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape" && !busy) onClose(); };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose]);

  useEffect(() => {
    if (teamSearch.trim().length < 2) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void credentialRequest<{ id: string; name: string; division: string }[]>(`/teams?${new URLSearchParams({ search: teamSearch.trim() })}`, { signal: controller.signal })
        .then((rows) => { if (!controller.signal.aborted) setTeamResults(rows); }).catch(() => undefined);
    }, 250);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [teamSearch]);

  /** Ejecuta una acción, recarga la ficha y muestra exactamente qué quedó guardado. */
  async function act(suffix: string, method: "POST" | "PATCH", body: object, saved: Notice) {
    setBusy(true);
    setNotice(undefined);
    try {
      const data = await credentialRequest<unknown>(`/${encodeURIComponent(id)}${suffix}`, { method, body: JSON.stringify(body) });
      const renewedId = data && typeof data === "object" && "id" in data && typeof data.id === "string" && data.id !== id ? data.id : null;
      const refreshed = await load(renewedId ?? id);
      if (renewedId) setId(renewedId);
      setNotice(saved);
      setConfirming(null);
      onChanged(refreshed.credential, id);
      return true;
    } catch (error) {
      setNotice({ kind: "error", title: "No se guardó", lines: [errorMessage(error)] });
      return false;
    } finally {
      setBusy(false);
    }
  }

  if (!detail) {
    return (
      <Shell title="Gestionar ID" onClose={onClose} headingRef={heading} busy={busy}>
        <div className="p-6">{loadError ? <p role="alert" className="text-sm text-red-800">{loadError}</p> : <p className={hint}>Cargando la ID…</p>}</div>
      </Shell>
    );
  }

  const credential: Credential = detail.credential;
  const currentRoles = credential.roles.map(({ role }) => role);
  const certifiedRoles = currentRoles.filter((role): role is CertifiedRole => role !== "player");
  const hasPlayer = currentRoles.includes("player");
  const hasCoach = currentRoles.includes("coach");
  const canHavePlayer = hasPlayer || Boolean(detail.playerProfile) || Boolean(linkPlayerId) || credential.subjectType === "player";
  const cardActive = credential.cardStatus === "active";
  const suspended = credential.memberStatus === "suspended";
  const cardUsable = cardActive && !suspended;
  const playerRole = credential.roles.find(({ role }) => role === "player");
  const tone = credential.status === "active" ? "ok" : credential.status === "inactive" ? "warn" : "bad";
  const verifyUrl = credential.verifyUrl || `${getLufaAppUrl()}/verificar/${encodeURIComponent(credential.publicId)}`;

  const now = new Date();
  const activeEnds = detail.memberships.filter((period) => period.status === "active" && new Date(period.endsAt) > now).map((period) => new Date(period.endsAt).getTime());
  const paymentStart = activeEnds.length ? new Date(Math.max(...activeEnds)) : now;
  const paymentEnd = addMonths(paymentStart, payment.months || 0);
  const amountMinor = payment.amount ? Math.round(Number(payment.amount) * 100) : 0;
  const rolesChanged = roles.slice().sort().join() !== currentRoles.slice().sort().join();
  const addingPlayer = roles.includes("player") && !hasPlayer;
  const activeCertificationsForRole = detail.certifications.filter((item) => item.role === certification.role && item.status === "active" && new Date(item.expiresAt) > now);

  const tabs: { id: Tab; label: string; attention?: boolean; hidden?: boolean }[] = [
    { id: "summary", label: "Resumen" },
    { id: "roles", label: "Roles" },
    { id: "membership", label: "Membresía", attention: playerRole?.status === "membership_required" },
    { id: "certifications", label: "Certificaciones", attention: credential.roles.some((role) => role.status === "certification_required" || role.status === "certification_expired") },
    { id: "teams", label: "Equipos", hidden: !hasCoach },
    { id: "member", label: "Miembro y tarjeta", attention: suspended },
    { id: "history", label: `Historial (${detail.history.length})` },
  ];

  function submitPayment(event: FormEvent) {
    event.preventDefault();
    if (!payment.months || payment.months < 1 || payment.months > 24) return;
    void act("/memberships", "POST", {
      method: payment.method, months: payment.months, reference: payment.reference.trim() || undefined,
      ...(amountMinor > 0 ? { amountMinor } : {}),
    }, {
      kind: "saved", title: "Pago de membresía registrado",
      lines: [
        `${methodLabels[payment.method]} · ${payment.months} ${payment.months === 1 ? "mes" : "meses"} · del ${shortDate(paymentStart)} al ${shortDate(paymentEnd)}`,
        ...(amountMinor > 0 ? [`Monto: ${money(amountMinor)}`] : []),
        ...(payment.reference.trim() ? [`Referencia: ${payment.reference.trim()}`] : []),
      ],
    }).then((ok) => { if (ok) setPayment({ method: "cash", months: 12, amount: "", reference: "" }); });
  }

  function submitCertification(event: FormEvent) {
    event.preventDefault();
    void act("/certifications", "POST", {
      role: certification.role, level: certification.level, issuer: certification.issuer.trim() || "LUFA",
      expiresAt: certification.expiresAt || undefined, notes: certification.notes.trim() || undefined,
    }, {
      kind: "saved", title: "Certificación otorgada",
      lines: [`${roleNames[certification.role]} · ${levelLabel(certification.level)} · ${certification.issuer.trim() || "LUFA"} · vence ${shortDate(certification.expiresAt || seasonEnd())}`],
    }).then((ok) => { if (ok) setCertification((current) => ({ ...current, notes: "" })); });
  }

  return (
    <Shell
      title={credential.displayName}
      subtitle={<>N.º LUFA <b>{credential.lufaNumber}</b> · Tarjeta {credential.memberNumber}</>}
      badge={<Badge tone={tone}>{statusLabels[credential.status]}</Badge>}
      onClose={onClose}
      headingRef={heading}
      busy={busy}
      tabs={tabs.filter((item) => !item.hidden)}
      activeTab={tab}
      onTab={setTab}
      notice={notice}
      onDismissNotice={() => setNotice(undefined)}
    >
      {tab === "summary" && (
        <div className="space-y-6">
          <div className={`rounded-md border px-4 py-3 text-sm ${tone === "ok" ? "border-emerald-200 bg-emerald-50 text-emerald-900" : tone === "warn" ? "border-amber-200 bg-amber-50 text-amber-900" : "border-red-200 bg-red-50 text-red-900"}`}>
            <p className="font-semibold">{statusLabels[credential.status]}</p>
            <p>{statusExplanations[credential.status]}{suspended && detail.suspendedReason ? ` Motivo: ${detail.suspendedReason}.` : ""}</p>
          </div>

          <Section title="Habilitaciones por rol" description={cardUsable ? "Se calculan en vivo cada vez que alguien escanea el QR." : "La tarjeta no es válida: aunque un rol figure habilitado, el QR se muestra como no válido."}>
            <div className="overflow-x-auto">
              <table className={table}>
                <thead><tr><th className={th}>Rol</th><th className={th}>Estado</th><th className={th}>Nivel</th><th className={th}>Válido hasta</th><th className={th}>Equipos</th></tr></thead>
                <tbody>
                  {credential.roles.map((role) => (
                    <tr key={role.role}>
                      <td className={`${td} font-semibold`}>{roleNames[role.role]}</td>
                      <td className={td}>
                        <Badge tone={!cardUsable ? "muted" : role.status === "valid" ? "ok" : "warn"}>{roleStatusLabels[role.status]}</Badge>
                        {roleStatusHelp[role.status] && <p className="mt-1 text-xs text-slate-600">{roleStatusHelp[role.status]}</p>}
                      </td>
                      <td className={td}>{role.level ? levelLabel(role.level) : "—"}</td>
                      <td className={td}>{role.validUntil ? shortDate(role.validUntil) : "—"}</td>
                      <td className={td}>{role.teams.join(", ") || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Section>

          <Section title="Datos de la persona">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
              {([
                ["Nombre en la tarjeta", credential.displayName],
                ["N.º LUFA (permanente)", credential.lufaNumber],
                ["Correo vinculado", detail.linkedEmail ?? "—"],
                ["Cuenta LUFA", detail.accountLinked ? "Vinculada" : "Se vincula cuando la persona verifique ese correo"],
                ["Ficha de jugador", detail.playerProfile ? `${detail.playerProfile.name} · ${detail.playerProfile.teamName} · ${playerStatusLabels[detail.playerProfile.status] ?? detail.playerProfile.status}` : "Sin ficha vinculada"],
                ["Equipo / asociación que se muestra", credential.organizationName],
                ["Nacionalidad", credential.nationalityCode],
                ["Fecha de nacimiento", shortDate(credential.dateOfBirth)],
              ] as const).map(([name, value]) => (
                <div key={name} className="border-b border-slate-100 pb-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</dt>
                  <dd className="mt-0.5 break-words text-sm text-slate-950">{value}</dd>
                </div>
              ))}
            </dl>
          </Section>

          <Section title="Tarjeta y verificación">
            <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-3">
              {([
                ["Tarjeta", `${credential.memberNumber} · ${statusLabels[credential.cardStatus]}`],
                ["Emitida", shortDate(credential.issuedAt)],
                ["Vence la tarjeta", shortDate(credential.expiresAt)],
                ["Verificaciones del QR", String(detail.verificationCount)],
                ["Última verificación", detail.lastVerifiedAt ? dateTime(detail.lastVerifiedAt) : "Nunca"],
              ] as const).map(([name, value]) => (
                <div key={name} className="border-b border-slate-100 pb-2">
                  <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{name}</dt>
                  <dd className="mt-0.5 text-sm text-slate-950">{value}</dd>
                </div>
              ))}
            </dl>
            <ShareLinks url={verifyUrl} />
          </Section>
        </div>
      )}

      {tab === "roles" && (
        <Section title="Roles de la ID" description="Definen qué habilitaciones se verifican. Agregar un rol no lo habilita por sí solo: Jugador necesita membresía paga y Juez o Entrenador necesitan certificación.">
          {!cardActive && <p className="text-sm text-amber-800">Solo podés editar los roles de una tarjeta vigente.</p>}
          <fieldset className="space-y-2" disabled={busy || !cardActive}>
            <legend className="sr-only">Roles</legend>
            {allRoles.filter((role) => role !== "player" || canHavePlayer).map((role) => (
              <label key={role} className="flex items-start gap-3 rounded-md border border-slate-200 px-3 py-2.5 text-sm">
                <input type="checkbox" className="mt-0.5" checked={roles.includes(role)} onChange={(event) => {
                  const checked = event.target.checked;
                  setRoles((current) => checked ? [...current, role] : current.filter((item) => item !== role));
                }} />
                <span>
                  <span className="font-semibold">{roleNames[role]}</span>
                  <span className="block text-slate-600">{role === "player" ? "Requiere ficha de jugador aprobada, equipo activo y membresía paga." : "Requiere una certificación vigente de este rol."}</span>
                </span>
              </label>
            ))}
            {!canHavePlayer && <p className={hint}>Para agregar el rol Jugador, buscá a la persona en Jugadores y abrí esta ID desde su ficha.</p>}
          </fieldset>
          {rolesChanged && roles.length > 0 && (
            <SavePreview>
              roles <b>{roles.map((role) => roleNames[role]).join(" · ")}</b> (antes: {currentRoles.map((role) => roleNames[role]).join(" · ")}).
              {addingPlayer && linkPlayerId && !detail.playerProfile ? " También se vincula la ficha de jugador seleccionada." : ""}
            </SavePreview>
          )}
          {roles.length === 0 && <p className="text-sm text-red-800">Elegí al menos un rol.</p>}
          <button type="button" className={primaryButton} disabled={busy || !cardActive || !rolesChanged || roles.length === 0} onClick={() => void act("", "PATCH", {
            action: "set-roles", roles, ...(addingPlayer && linkPlayerId && !detail.playerProfile ? { playerId: linkPlayerId } : {}),
          }, { kind: "saved", title: "Roles actualizados", lines: [roles.map((role) => roleNames[role]).join(" · ")] })}>
            Guardar roles
          </button>
        </Section>
      )}

      {tab === "membership" && (
        <div className="space-y-6">
          <Section title="Pagos de membresía" description="El rol Jugador solo está habilitado mientras algún período pago cubre la fecha de hoy. Los pagos de la tienda se cargan solos.">
            {!hasPlayer && <p className="text-sm text-amber-800">Esta ID no tiene el rol Jugador: la membresía queda registrada pero no habilita nada hasta que agregues ese rol.</p>}
            {detail.memberships.length === 0 ? <p className={hint}>Todavía no hay pagos registrados.</p> : (
              <div className="overflow-x-auto">
                <table className={table}>
                  <thead><tr><th className={th}>Período</th><th className={th}>Origen</th><th className={th}>Monto</th><th className={th}>Referencia</th><th className={th}>Estado</th><th className={th}><span className="sr-only">Acciones</span></th></tr></thead>
                  <tbody>
                    {detail.memberships.map((period) => {
                      const current = period.status === "active" && new Date(period.startsAt) <= now && new Date(period.endsAt) > now;
                      const future = period.status === "active" && new Date(period.startsAt) > now;
                      return (
                        <tr key={period.id} className={period.status === "voided" ? "text-slate-400" : ""}>
                          <td className={td}>{shortDate(period.startsAt)} → {shortDate(period.endsAt)}</td>
                          <td className={td}>{period.source === "store_order" ? "Tienda" : `Offline · ${paymentMethodLabel(period.method)}`}</td>
                          <td className={td}>{period.amountMinor ? money(period.amountMinor) : "—"}</td>
                          <td className={`${td} break-words`}>{period.reference ?? "—"}</td>
                          <td className={td}>
                            {period.status === "voided" ? <><Badge tone="muted">Anulado</Badge><p className="mt-1 text-xs">{period.voidReason}</p></>
                              : current ? <Badge tone="ok">Vigente</Badge> : future ? <Badge tone="muted">Próximo</Badge> : <Badge tone="muted">Finalizado</Badge>}
                          </td>
                          <td className={`${td} text-right`}>
                            {period.status === "active" && period.source === "offline" && (confirming?.kind === "void" && confirming.id === period.id ? (
                              <div className="flex min-w-56 flex-col gap-2 text-left">
                                <label className={label}>Motivo de la anulación
                                  <input className={input} autoFocus value={confirming.reason ?? ""} maxLength={300} onChange={(event) => setConfirming({ ...confirming, reason: event.target.value })} />
                                </label>
                                <div className="flex gap-2">
                                  <button type="button" className={dangerButton} disabled={busy || !confirming.reason?.trim()} onClick={() => void act(`/memberships/${encodeURIComponent(period.id)}`, "PATCH", { action: "void", reason: confirming.reason }, {
                                    kind: "saved", title: "Pago anulado", lines: [`${shortDate(period.startsAt)} → ${shortDate(period.endsAt)} · Motivo: ${confirming.reason?.trim()}`],
                                  })}>Confirmar</button>
                                  <button type="button" className={button} onClick={() => setConfirming(null)}>Cancelar</button>
                                </div>
                              </div>
                            ) : <button type="button" className={button} disabled={busy} onClick={() => setConfirming({ kind: "void", id: period.id, reason: "" })}>Anular</button>)}
                            {period.status === "active" && period.source === "store_order" && <span className="text-xs text-slate-500">Se anula reembolsando la orden</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Registrar pago offline" description="Para pagos en efectivo, transferencia o cobrados por el equipo. Los meses se suman a continuación de la membresía vigente.">
            {suspended && <p className="text-sm text-amber-800">El miembro está suspendido: levantá la suspensión antes de registrar pagos.</p>}
            <form onSubmit={submitPayment} className="space-y-3">
              <fieldset className="grid gap-3 sm:grid-cols-4" disabled={busy || suspended}>
                <label className={label}>Medio de pago
                  <select className={input} value={payment.method} onChange={(event) => setPayment({ ...payment, method: event.target.value as MembershipPaymentMethod })}>
                    {membershipPaymentMethods.map((method) => <option key={method} value={method}>{methodLabels[method]}</option>)}
                  </select>
                </label>
                <label className={label}>Meses
                  <input type="number" min={1} max={24} required className={input} value={payment.months || ""} onChange={(event) => setPayment({ ...payment, months: Number(event.target.value) })} />
                </label>
                <label className={label}>Monto UYU (opcional)
                  <input type="number" min={0} step="0.01" className={input} value={payment.amount} onChange={(event) => setPayment({ ...payment, amount: event.target.value })} />
                </label>
                <label className={label}>Referencia (opcional)
                  <input maxLength={200} className={input} placeholder="Recibo, transferencia…" value={payment.reference} onChange={(event) => setPayment({ ...payment, reference: event.target.value })} />
                </label>
              </fieldset>
              {payment.months >= 1 && payment.months <= 24 && (
                <SavePreview>
                  pago <b>{methodLabels[payment.method]}</b> por <b>{payment.months} {payment.months === 1 ? "mes" : "meses"}</b>, del <b>{shortDate(paymentStart)}</b> al <b>{shortDate(paymentEnd)}</b>
                  {amountMinor > 0 ? <>, monto <b>{money(amountMinor)}</b></> : ""}{payment.reference.trim() ? <>, referencia <b>{payment.reference.trim()}</b></> : ""}.
                  {hasPlayer ? ` El rol Jugador queda cubierto hasta el ${shortDate(paymentEnd)} (si la ficha y el equipo están activos).` : ""}
                </SavePreview>
              )}
              <button type="submit" className={primaryButton} disabled={busy || suspended || !payment.months || payment.months < 1 || payment.months > 24}>Registrar pago</button>
            </form>
          </Section>
        </div>
      )}

      {tab === "certifications" && (
        <div className="space-y-6">
          <Section title="Certificaciones" description="Cada certificación habilita un rol (Juez o Entrenador) hasta su vencimiento. Si hay varias vigentes, se muestra el nivel más alto.">
            {detail.certifications.length === 0 ? <p className={hint}>Todavía no hay certificaciones.</p> : (
              <div className="overflow-x-auto">
                <table className={table}>
                  <thead><tr><th className={th}>Rol</th><th className={th}>Nivel</th><th className={th}>Emisor</th><th className={th}>Vigencia</th><th className={th}>Estado</th><th className={th}><span className="sr-only">Acciones</span></th></tr></thead>
                  <tbody>
                    {detail.certifications.map((item) => {
                      const expired = new Date(item.expiresAt) <= now;
                      return (
                        <tr key={item.id} className={item.status === "revoked" ? "text-slate-400" : ""}>
                          <td className={`${td} font-semibold`}>{roleNames[item.role]}</td>
                          <td className={td}>{levelLabel(item.level)}</td>
                          <td className={td}>{item.issuer}</td>
                          <td className={td}>{shortDate(item.issuedAt)} → {shortDate(item.expiresAt)}{item.notes && <p className="mt-1 text-xs text-slate-500">{item.notes}</p>}</td>
                          <td className={td}>{item.status === "revoked" ? <Badge tone="muted">Revocada</Badge> : expired ? <Badge tone="warn">Vencida</Badge> : <Badge tone="ok">Vigente</Badge>}</td>
                          <td className={`${td} text-right`}>
                            {item.status === "active" && (confirming?.kind === "revoke-certification" && confirming.id === item.id ? (
                              <div className="flex justify-end gap-2">
                                <button type="button" className={dangerButton} disabled={busy} onClick={() => void act(`/certifications/${encodeURIComponent(item.id)}`, "PATCH", { action: "revoke" }, {
                                  kind: "saved", title: "Certificación revocada", lines: [`${roleNames[item.role]} · ${levelLabel(item.level)}`],
                                })}>Sí, revocar</button>
                                <button type="button" className={button} onClick={() => setConfirming(null)}>Cancelar</button>
                              </div>
                            ) : <button type="button" className={button} disabled={busy} onClick={() => setConfirming({ kind: "revoke-certification", id: item.id })}>Revocar</button>)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          <Section title="Otorgar o renovar certificación">
            {certifiedRoles.length === 0 ? <p className={hint}>Esta ID no tiene rol de Juez ni de Entrenador. Agregalo en la pestaña Roles para poder certificarlo.</p> : (
              <form onSubmit={submitCertification} className="space-y-3">
                <fieldset className="grid gap-3 sm:grid-cols-4" disabled={busy}>
                  <label className={label}>Rol
                    <select className={input} value={certification.role} onChange={(event) => setCertification({ ...certification, role: event.target.value as CertifiedRole })}>
                      {certifiedRoleList.filter((role) => certifiedRoles.includes(role)).map((role) => <option key={role} value={role}>{roleNames[role]}</option>)}
                    </select>
                  </label>
                  <label className={label}>Nivel
                    <select className={input} value={certification.level} onChange={(event) => setCertification({ ...certification, level: event.target.value as CertificationLevel })}>
                      {certificationLevels.map((level) => <option key={level} value={level}>{levelLabel(level)}</option>)}
                    </select>
                  </label>
                  <label className={label}>Emisor
                    <input className={input} maxLength={80} value={certification.issuer} onChange={(event) => setCertification({ ...certification, issuer: event.target.value })} />
                  </label>
                  <label className={label}>Vence
                    <input type="date" required className={input} min={today()} value={certification.expiresAt} onChange={(event) => setCertification({ ...certification, expiresAt: event.target.value })} />
                  </label>
                  <label className={`${label} sm:col-span-4`}>Notas (opcional)
                    <input className={input} maxLength={500} placeholder="Curso, evaluación, acta…" value={certification.notes} onChange={(event) => setCertification({ ...certification, notes: event.target.value })} />
                  </label>
                </fieldset>
                {certification.expiresAt && (
                  <SavePreview>
                    certificación de <b>{roleNames[certification.role]}</b> · <b>{levelLabel(certification.level)}</b>, emitida por <b>{certification.issuer.trim() || "LUFA"}</b>, válida hasta el <b>{shortDate(certification.expiresAt)}</b>.
                    {activeCertificationsForRole.length ? ` Se suma a la vigente (${activeCertificationsForRole.map((item) => `${levelLabel(item.level)} hasta ${shortDate(item.expiresAt)}`).join(", ")}); no la reemplaza.` : ` El rol ${roleNames[certification.role]} queda habilitado hasta esa fecha.`}
                  </SavePreview>
                )}
                <button type="submit" className={primaryButton} disabled={busy || !certification.expiresAt}>Otorgar certificación</button>
              </form>
            )}
          </Section>
        </div>
      )}

      {tab === "teams" && (
        <div className="space-y-6">
          <Section title="Equipos que dirige" description="Se muestran en la verificación del entrenador mientras el vínculo y el equipo estén activos.">
            {detail.coachAssignments.length === 0 ? <p className={hint}>Todavía no está vinculado a ningún equipo.</p> : (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {detail.coachAssignments.map((assignment) => (
                  <li key={assignment.id} className="flex flex-col gap-2 px-3 py-2.5 text-sm sm:flex-row sm:items-center sm:justify-between">
                    <span className={assignment.active ? "" : "text-slate-400"}>
                      <b>{assignment.teamName}</b> · Temporada {assignment.season} · {assignment.role === "head" ? "Entrenador principal" : "Asistente"} {assignment.active ? <Badge tone="ok">Activo</Badge> : <Badge tone="muted">Desvinculado</Badge>}
                    </span>
                    <button type="button" className={button} disabled={busy} onClick={() => void act(`/coach-assignments/${encodeURIComponent(assignment.id)}`, "PATCH", { active: !assignment.active }, {
                      kind: "saved", title: assignment.active ? "Entrenador desvinculado" : "Vínculo reactivado", lines: [`${assignment.teamName} · Temporada ${assignment.season}`],
                    })}>{assignment.active ? "Desvincular" : "Reactivar"}</button>
                  </li>
                ))}
              </ul>
            )}
          </Section>
          <Section title="Vincular a un equipo">
            <label className={`${label} block`}>Buscar equipo
              <input type="search" className={input} value={teamSearch} maxLength={80} placeholder="Nombre del equipo" onChange={(event) => setTeamSearch(event.target.value)} />
            </label>
            {teamSearch.trim().length >= 2 && teamResults.length > 0 && !newAssignment && (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {teamResults.map((team) => (
                  <li key={team.id}>
                    <button type="button" className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50" onClick={() => setNewAssignment({ teamId: team.id, teamName: team.name, season: new Date().getUTCFullYear(), role: "head" })}>
                      <b>{team.name}</b> · {team.division}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {newAssignment && (
              <div className="space-y-3 rounded-md border border-slate-200 p-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <p className="text-sm"><span className="block text-xs font-semibold uppercase text-slate-500">Equipo</span>{newAssignment.teamName}</p>
                  <label className={label}>Temporada
                    <input type="number" min={2000} max={2100} className={input} value={newAssignment.season} onChange={(event) => setNewAssignment({ ...newAssignment, season: Number(event.target.value) })} />
                  </label>
                  <label className={label}>Rol en el equipo
                    <select className={input} value={newAssignment.role} onChange={(event) => setNewAssignment({ ...newAssignment, role: event.target.value as "head" | "assistant" })}>
                      <option value="head">Entrenador principal</option>
                      <option value="assistant">Asistente</option>
                    </select>
                  </label>
                </div>
                <SavePreview><b>{newAssignment.role === "head" ? "Entrenador principal" : "Asistente"}</b> de <b>{newAssignment.teamName}</b> en la temporada <b>{newAssignment.season}</b>.</SavePreview>
                <div className="flex gap-2">
                  <button type="button" className={primaryButton} disabled={busy} onClick={() => void act("/coach-assignments", "POST", { teamId: newAssignment.teamId, season: newAssignment.season, role: newAssignment.role }, {
                    kind: "saved", title: "Entrenador vinculado", lines: [`${newAssignment.teamName} · Temporada ${newAssignment.season} · ${newAssignment.role === "head" ? "Principal" : "Asistente"}`],
                  }).then((ok) => { if (ok) { setNewAssignment(null); setTeamSearch(""); setTeamResults([]); } })}>Vincular</button>
                  <button type="button" className={button} onClick={() => setNewAssignment(null)}>Cancelar</button>
                </div>
              </div>
            )}
          </Section>
        </div>
      )}

      {tab === "member" && (
        <div className="space-y-8">
          <Section title="Nacionalidad" description="Se muestra en la tarjeta y viaja en la firma digital para verificaciones internacionales.">
            <form className="space-y-3" onSubmit={(event) => {
              event.preventDefault();
              void act("", "PATCH", { action: "update-member", nationalityCode: nationality }, { kind: "saved", title: "Nacionalidad actualizada", lines: [`${credential.nationalityCode} → ${nationality}`] });
            }}>
              <label className={`${label} block max-w-40`}>Código de dos letras
                <input className={input} value={nationality} pattern="[A-Za-z]{2}" maxLength={2} required onChange={(event) => setNationality(event.target.value.toUpperCase())} />
              </label>
              {nationality !== credential.nationalityCode && nationality.length === 2 && <SavePreview>nacionalidad <b>{nationality}</b> (antes: {credential.nationalityCode}).</SavePreview>}
              <button type="submit" className={primaryButton} disabled={busy || nationality === credential.nationalityCode || nationality.length !== 2}>Guardar nacionalidad</button>
            </form>
          </Section>

          <Section title="Suspensión" description="Bloquea todos los roles de la persona, aunque pague. Se usa para sanciones disciplinarias.">
            {suspended ? (
              <div className="space-y-3">
                <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-900">Suspendido. Motivo: {detail.suspendedReason}</p>
                <button type="button" className={primaryButton} disabled={busy} onClick={() => void act("", "PATCH", { action: "reinstate" }, { kind: "saved", title: "Suspensión levantada", lines: ["Los roles vuelven a evaluarse normalmente."] })}>Levantar suspensión</button>
              </div>
            ) : (
              <div className="space-y-3">
                <label className={`${label} block`}>Motivo de la suspensión
                  <textarea className={input} rows={2} maxLength={500} value={suspendReason} onChange={(event) => setSuspendReason(event.target.value)} placeholder="Ej.: sanción del tribunal de disciplina del 12/11" />
                </label>
                {suspendReason.trim() && <SavePreview>miembro <b>suspendido</b> con el motivo “{suspendReason.trim()}”. La verificación mostrará la ID como no válida.</SavePreview>}
                <button type="button" className={dangerButton} disabled={busy || !suspendReason.trim()} onClick={() => void act("", "PATCH", { action: "suspend", reason: suspendReason.trim() }, {
                  kind: "saved", title: "Miembro suspendido", lines: [`Motivo: ${suspendReason.trim()}`],
                }).then((ok) => { if (ok) setSuspendReason(""); })}>Suspender miembro</button>
              </div>
            )}
          </Section>

          <Section title="Tarjeta" description={`Tarjeta ${credential.memberNumber} · ${statusLabels[credential.cardStatus]} · vence ${shortDate(credential.expiresAt)}. El N.º LUFA, las membresías y las certificaciones son de la persona y se mantienen al renovar.`}>
            {credential.cardStatus === "active" && (confirming?.kind === "revoke-card" ? (
              <div className="space-y-3 rounded-md border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-900">Se guardará: tarjeta <b>{credential.memberNumber}</b> revocada. El QR dejará de ser válido de inmediato y la tienda no la reactiva con nuevos pagos. No se puede deshacer: para volver a habilitarla hay que emitir una nueva.</p>
                <div className="flex gap-2">
                  <button type="button" className={dangerButton} disabled={busy} onClick={() => void act("", "PATCH", { action: "revoke" }, { kind: "saved", title: "Tarjeta revocada", lines: [credential.memberNumber] })}>Sí, revocar tarjeta</button>
                  <button type="button" className={button} onClick={() => setConfirming(null)}>Cancelar</button>
                </div>
              </div>
            ) : <button type="button" className={button} disabled={busy} onClick={() => setConfirming({ kind: "revoke-card" })}>Revocar tarjeta</button>)}
            {credential.cardStatus === "expired" && (confirming?.kind === "renew-card" ? (
              <div className="space-y-3 rounded-md border border-sky-200 bg-sky-50 p-3">
                <p className="text-sm text-sky-950">Se guardará: una tarjeta nueva para la temporada {new Date().getUTCFullYear()} con los mismos roles, el mismo N.º LUFA ({credential.lufaNumber}) y un QR nuevo. La tarjeta {credential.memberNumber} queda revocada.</p>
                <div className="flex gap-2">
                  <button type="button" className={primaryButton} disabled={busy || suspended} onClick={() => void act("", "PATCH", { action: "renew" }, { kind: "saved", title: "Tarjeta renovada", lines: ["Se emitió una tarjeta nueva para esta temporada."] })}>Sí, renovar</button>
                  <button type="button" className={button} onClick={() => setConfirming(null)}>Cancelar</button>
                </div>
              </div>
            ) : <button type="button" className={primaryButton} disabled={busy || suspended} onClick={() => setConfirming({ kind: "renew-card" })}>Renovar tarjeta</button>)}
            {credential.cardStatus === "revoked" && <p className={hint}>Esta tarjeta está revocada. Para volver a habilitar a la persona, emití una nueva ID desde la búsqueda.</p>}
          </Section>
        </div>
      )}

      {tab === "history" && (
        <Section title="Historial de cambios" description="Todo lo que se guardó sobre esta persona, quién lo hizo y cuándo.">
          {detail.history.length === 0 ? <p className={hint}>Sin cambios registrados.</p> : (
            <ol className="space-y-3">
              {detail.history.map((entry) => (
                <li key={entry.id} className="rounded-md border border-slate-200 px-3 py-2.5 text-sm">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-semibold text-slate-950">{entry.summary}</span>
                    <span className="text-xs text-slate-500">{dateTime(entry.at)} · {entry.actor ?? "Sistema"}</span>
                  </div>
                  {historyDetails(entry.details).length > 0 && <p className="mt-1 text-slate-600">{historyDetails(entry.details).join(" · ")}</p>}
                </li>
              ))}
            </ol>
          )}
        </Section>
      )}
    </Shell>
  );
}

function ShareLinks({ url }: { url: string }) {
  const [status, setStatus] = useState("");
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a className={button} href={url} target="_blank" rel="noreferrer">Abrir verificación y QR</a>
      <button type="button" className={button} onClick={() => {
        navigator.clipboard.writeText(url).then(() => setStatus("Enlace copiado."), () => setStatus("No pudimos copiarlo. Abrí el enlace para copiar la dirección."));
      }}>Copiar enlace</button>
      <span role="status" className={hint}>{status}</span>
    </div>
  );
}

function Shell({ title, subtitle, badge, children, onClose, headingRef, busy, tabs, activeTab, onTab, notice, onDismissNotice }: {
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  onClose: () => void;
  headingRef: RefObject<HTMLHeadingElement | null>;
  busy: boolean;
  tabs?: { id: Tab; label: string; attention?: boolean }[];
  activeTab?: Tab;
  onTab?: (tab: Tab) => void;
  notice?: Notice;
  onDismissNotice?: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-stretch justify-center bg-black/55 sm:items-center sm:p-6" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}>
      <div role="dialog" aria-modal="true" aria-labelledby="credential-modal-title" aria-busy={busy}
        className="flex h-full w-full max-w-4xl flex-col overflow-hidden bg-white shadow-2xl sm:h-[88vh] sm:rounded-lg">
        <header className="border-b border-slate-200 px-5 pt-4">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="credential-modal-title" ref={headingRef} tabIndex={-1} className="text-xl font-bold text-slate-950 focus:outline-none">{title}</h2>
                {badge}
              </div>
              {subtitle && <p className="mt-0.5 text-sm text-slate-600">{subtitle}</p>}
            </div>
            <button type="button" onClick={onClose} disabled={busy} aria-label="Cerrar" className="rounded-md p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-brand-700 disabled:opacity-50">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6 6 18" /></svg>
            </button>
          </div>
          {tabs && (
            <nav className="-mb-px mt-3 flex gap-1 overflow-x-auto" aria-label="Secciones de la ID">
              {tabs.map((item) => (
                <button key={item.id} type="button" aria-current={activeTab === item.id ? "page" : undefined} onClick={() => onTab?.(item.id)}
                  className={`whitespace-nowrap border-b-2 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-brand-700 ${activeTab === item.id ? "border-brand-700 text-brand-800" : "border-transparent text-slate-600 hover:text-slate-900"}`}>
                  {item.label}{item.attention && <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-500 align-middle" aria-label="requiere atención" />}
                </button>
              ))}
            </nav>
          )}
        </header>
        {notice && (
          <div role={notice.kind === "error" ? "alert" : "status"} className={`flex items-start gap-3 border-b px-5 py-3 text-sm ${notice.kind === "error" ? "border-red-200 bg-red-50 text-red-900" : "border-emerald-200 bg-emerald-50 text-emerald-900"}`}>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{notice.kind === "saved" ? "✓ Guardado: " : ""}{notice.title}</p>
              {notice.lines?.map((line) => <p key={line}>{line}</p>)}
            </div>
            <button type="button" className="text-xs font-semibold underline" onClick={onDismissNotice}>Ocultar</button>
          </div>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
        <footer className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">Cada acción se guarda al confirmarla y queda registrada en el Historial.</p>
          <button type="button" className={button} onClick={onClose} disabled={busy}>Cerrar</button>
        </footer>
      </div>
    </div>
  );
}
