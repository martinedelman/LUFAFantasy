"use client";
/* eslint-disable @next/next/no-img-element */

import { type PointerEvent, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { DigitalCredentialResponseDto, DigitalCredentialRole, DigitalCredentialRoleStatus, DigitalCredentialStatus } from "@lufa/contracts";
import "./DigitalCredentialCard.css";

type Locale = "es" | "en";
type CredentialFace = "details" | "qr";

type Text = Record<string, string>;
const text: Record<Locale, Text> = {
  es: {
    title: "ID Digital", official: "CREDENCIAL OFICIAL LUFA", lufaNumber: "N.º LUFA", card: "Tarjeta", role: "Roles", team: "Equipo / Asociación", nationality: "Nacionalidad", birth: "Fecha de nacimiento", issued: "Fecha de emisión", expiry: "Vencimiento de la tarjeta", status: "Estado", qrTitle: "Verificar credencial", qrLead: "Escaneá para verificar la credencial", qrHelp: "Verificá siempre en lufa.com.uy: el estado se consulta en vivo.", details: "Datos", qr: "QR", download: "Descargar QR", print: "Imprimir credencial", language: "English", fullName: "Nombre completo",
    rolesTitle: "Habilitaciones", validUntil: "Válido hasta", level: "Nivel", international: "Internacional", teams: "Equipos",
    liveTitle: "Verificado en vivo por LUFA", checked: "Consultado", signatureValid: "Firma digital LUFA válida", signatureInvalid: "La firma digital no coincide: no confíes en este QR", signatureUnavailable: "Esta credencial no trae firma digital", signatureChecking: "Comprobando firma digital…", signatureUnsupported: "Este dispositivo no puede comprobar la firma; el estado en vivo sigue siendo válido",
    missingMembership: "Para jugar, pagá tu membresía LUFA en la tienda o en tu equipo.", missingApproval: "Tu inscripción está pendiente de aprobación por LUFA.", missingCertification: "Tu certificación no está vigente. Contactá a LUFA para renovarla.", missingPlayer: "Tu ficha o tu equipo no están activos. Contactá a tu equipo o a LUFA.", store: "Ir a la tienda",
  },
  en: {
    title: "Digital Member ID", official: "OFFICIAL LUFA CREDENTIAL", lufaNumber: "LUFA No.", card: "Card", role: "Roles", team: "Team / Association", nationality: "Nationality", birth: "Date of birth", issued: "Issue date", expiry: "Card expiry", status: "Status", qrTitle: "Verify credential", qrLead: "Scan to verify this credential", qrHelp: "Always verify at lufa.com.uy: status is checked live.", details: "Details", qr: "QR", download: "Download QR", print: "Print credential", language: "Español", fullName: "Full name",
    rolesTitle: "Authorizations", validUntil: "Valid until", level: "Level", international: "International", teams: "Teams",
    liveTitle: "Verified live by LUFA", checked: "Checked", signatureValid: "Valid LUFA digital signature", signatureInvalid: "Digital signature does not match: do not trust this QR", signatureUnavailable: "This credential carries no digital signature", signatureChecking: "Checking digital signature…", signatureUnsupported: "This device cannot check the signature; the live status is still authoritative",
    missingMembership: "To play, pay your LUFA membership in the store or through your team.", missingApproval: "Your registration is pending LUFA approval.", missingCertification: "Your certification is not current. Contact LUFA to renew it.", missingPlayer: "Your player profile or team is not active. Contact your team or LUFA.", store: "Go to the store",
  },
};

const statusText: Record<DigitalCredentialStatus, { es: string; en: string }> = {
  active: { es: "Vigente", en: "Valid" },
  inactive: { es: "Sin habilitaciones vigentes", en: "No current authorizations" },
  suspended: { es: "Suspendida", en: "Suspended" },
  revoked: { es: "Revocada", en: "Revoked" },
  expired: { es: "Vencida", en: "Expired" },
  not_found: { es: "No encontrada", en: "Not found" },
};

const roleStatusText: Record<DigitalCredentialRoleStatus, { es: string; en: string }> = {
  valid: { es: "Habilitado", en: "Authorized" },
  membership_required: { es: "Membresía pendiente de pago", en: "Membership payment pending" },
  pending_approval: { es: "Pendiente de aprobación", en: "Pending approval" },
  player_inactive: { es: "Ficha inactiva", en: "Player profile inactive" },
  team_inactive: { es: "Equipo inactivo", en: "Team inactive" },
  certification_required: { es: "Sin certificación vigente", en: "No current certification" },
  certification_expired: { es: "Certificación vencida", en: "Certification expired" },
};

const roleNames: Record<DigitalCredentialRole, { es: string; en: string }> = {
  player: { es: "Jugador", en: "Player" },
  judge: { es: "Juez", en: "Referee" },
  coach: { es: "Entrenador", en: "Coach" },
};

export type SignatureState = "checking" | "valid" | "invalid" | "unavailable" | "unsupported";

function date(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-UY" : "en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function levelLabel(level: string | null, copy: Text) {
  if (!level) return null;
  return level === "internacional" ? copy.international : `${copy.level} ${level}`;
}

function LiveClock({ locale, checkedAt }: { locale: Locale; checkedAt: string }) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 1000); return () => window.clearInterval(timer); }, []);
  const format = (value: Date) => new Intl.DateTimeFormat(locale === "es" ? "es-UY" : "en-US", { dateStyle: "medium", timeStyle: "medium" }).format(value);
  return <><time dateTime={now.toISOString()} className="credential-live-clock">{format(now)}</time><small>{text[locale].checked}: {format(new Date(checkedAt))}</small></>;
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function createQrWithLogo(verifyUrl: string) {
  const qrDataUrl = await QRCode.toDataURL(verifyUrl, { width: 560, margin: 2, errorCorrectionLevel: "H", color: { dark: "#102f49", light: "#ffffff" } });
  const [qrImage, logo] = await Promise.all([loadImage(qrDataUrl), loadImage("/lufa_icon.png")]);
  const canvas = document.createElement("canvas");
  canvas.width = 560;
  canvas.height = 560;
  const context = canvas.getContext("2d");
  if (!context) return qrDataUrl;
  context.drawImage(qrImage, 0, 0, canvas.width, canvas.height);
  const plateSize = 116;
  const platePosition = (canvas.width - plateSize) / 2;
  context.fillStyle = "#ffffff";
  context.fillRect(platePosition, platePosition, plateSize, plateSize);
  context.drawImage(logo, platePosition + 14, platePosition + 14, plateSize - 28, plateSize - 28);
  return canvas.toDataURL("image/png");
}

export function DigitalCredentialCard({ credential, initialLocale = "es", mode = "holder", checkedAt, signature }: {
  credential: DigitalCredentialResponseDto;
  initialLocale?: Locale;
  /** holder: la propia persona en /mi-id. verification: quien escanea el QR en /verificar. */
  mode?: "holder" | "verification";
  checkedAt?: string;
  signature?: SignatureState;
}) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [face, setFace] = useState<CredentialFace>("details");
  const [qr, setQr] = useState("");
  const swipeStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const copy = text[locale];
  const active = credential.status === "active";
  const pending = credential.roles.filter((role) => role.status !== "valid");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lufa-id-locale");
      if (saved === "es" || saved === "en") setLocale(saved);
    } catch { /* almacenamiento no disponible */ }
  }, []);
  useEffect(() => { try { localStorage.setItem("lufa-id-locale", locale); } catch { /* almacenamiento no disponible */ } }, [locale]);
  useEffect(() => {
    // La URL canónica la arma el servidor: el QR siempre apunta a lufa.com.uy aunque la ID se abra en otro dominio.
    const verifyUrl = credential.verifyUrl;
    void createQrWithLogo(verifyUrl).then(setQr).catch(() => { void QRCode.toDataURL(verifyUrl, { width: 560, margin: 2, errorCorrectionLevel: "M" }).then(setQr); });
  }, [credential.verifyUrl]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    swipeStart.current = { x: event.clientX, y: event.clientY, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    if (Math.abs(horizontalDistance) > Math.abs(verticalDistance)) event.preventDefault();
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = swipeStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    swipeStart.current = null;
    if (Math.abs(horizontalDistance) >= 44 && Math.abs(horizontalDistance) > Math.abs(verticalDistance)) {
      setFace((currentFace) => currentFace === "details" ? "qr" : "details");
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };

  const hints = [...new Set(pending.map((role) =>
    role.status === "membership_required" ? copy.missingMembership
      : role.status === "pending_approval" ? copy.missingApproval
        : role.status === "player_inactive" || role.status === "team_inactive" ? copy.missingPlayer
          : copy.missingCertification))];
  const signatureText = signature ? {
    checking: copy.signatureChecking, valid: copy.signatureValid, invalid: copy.signatureInvalid,
    unavailable: copy.signatureUnavailable, unsupported: copy.signatureUnsupported,
  }[signature] : null;

  return (
    <section className="credential-wrap">
      {mode === "verification" && checkedAt ? (
        <div className={`credential-live ${active ? "" : "is-warning"}`} role="status">
          <span className="credential-live-dot" aria-hidden="true" />
          <div>
            <strong>{copy.liveTitle} · {statusText[credential.status][locale]}</strong>
            <LiveClock locale={locale} checkedAt={checkedAt} />
            {signatureText ? <small className={`credential-signature is-${signature}`}>{signatureText}</small> : null}
          </div>
        </div>
      ) : null}
      <div className="credential-topbar">
        <div className="credential-face-controls" aria-label={copy.title}>
          <button type="button" aria-pressed={face === "details"} onClick={() => setFace("details")}>{copy.details}</button>
          <button type="button" aria-pressed={face === "qr"} onClick={() => setFace("qr")}>{copy.qr}</button>
        </div>
        <button type="button" className="credential-language" onClick={() => setLocale(locale === "es" ? "en" : "es")}>{copy.language}</button>
      </div>

      <div
        className={`credential-scene ${face === "qr" ? "is-qr" : ""}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { swipeStart.current = null; }}
      >
        <div className="credential-card-flip">
          <article className="credential-card credential-front" aria-label={`${copy.title}: ${copy.details}`} aria-hidden={face !== "details"}>
            <header className="credential-brand-row">
              <img src="/lufa_icon.png" alt="LUFA" />
              <div><p>{copy.official}</p><h1>{copy.title}</h1></div>
              <span className={`credential-verified-badge ${active ? "" : "is-warning"}`} aria-label={statusText[credential.status][locale]}>{active ? "✓" : "!"}</span>
            </header>
            <section className="credential-identity">
              {credential.profilePicture ? <img src={credential.profilePicture} alt={`${copy.fullName}: ${credential.displayName}`} /> : <div className="credential-avatar" aria-hidden="true">{credential.displayName.slice(0, 1)}</div>}
              <div className="credential-identity-copy">
                <span>{copy.fullName}</span>
                <h2>{credential.displayName}</h2>
                <span>{copy.lufaNumber}</span>
                <b>{credential.lufaNumber}</b>
                <div className="credential-role-chips" aria-label={copy.role}>
                  {credential.roles.map((role) => (
                    <span className={`credential-role-chip ${role.status === "valid" ? "" : "is-pending"}`} key={role.role}>
                      {role.status === "valid" ? "" : "○ "}{roleNames[role.role][locale]}{role.level ? ` · ${levelLabel(role.level, copy)}` : ""}
                    </span>
                  ))}
                </div>
              </div>
            </section>
            <dl className="credential-details">
              <div className="credential-team"><dt>{copy.team}</dt><dd>{credential.organizationName}</dd></div>
              <div className="credential-status"><dt>{copy.status}</dt><dd className={active ? "" : "is-warning"}><span aria-hidden="true">{active ? "✓" : "!"}</span>{statusText[credential.status][locale]}</dd></div>
              <div><dt>{copy.nationality}</dt><dd>{credential.nationalityCode}</dd></div>
              <div><dt>{copy.issued}</dt><dd>{date(credential.issuedAt, locale)}</dd></div>
              <div><dt>{copy.birth}</dt><dd>{date(credential.dateOfBirth, locale)}</dd></div>
              <div><dt>{copy.expiry}</dt><dd>{date(credential.expiresAt, locale)}</dd></div>
            </dl>
          </article>

          <article className="credential-card credential-back" aria-label={`${copy.title}: ${copy.qr}`} aria-hidden={face !== "qr"}>
            <header className="credential-brand-row"><img src="/lufa_icon.png" alt="LUFA" /><div><p>{copy.official}</p><h1>{copy.qrTitle}</h1></div></header>
            <div className="credential-qr-content"><div className="credential-qr-frame">{qr ? <img src={qr} alt={copy.qrLead} /> : <span aria-live="polite">…</span>}</div><h2>{copy.qrLead}</h2><p>{copy.qrHelp}</p><div className="credential-back-member">{credential.lufaNumber} · {copy.card} {credential.memberNumber}</div></div>
          </article>
        </div>
      </div>

      <p className="credential-swipe-hint" aria-live="polite">
        {face === "details"
          ? locale === "es" ? "Deslizá horizontalmente para ver el QR" : "Swipe horizontally to view the QR"
          : locale === "es" ? "Deslizá horizontalmente para volver a los datos" : "Swipe horizontally to return to the details"}
      </p>

      <section className="credential-roles" aria-labelledby="credential-roles-title">
        <h2 id="credential-roles-title">{copy.rolesTitle}</h2>
        <ul>
          {credential.roles.map((role) => (
            <li key={role.role} className={role.status === "valid" ? "is-valid" : "is-pending"}>
              <div>
                <strong>{roleNames[role.role][locale]}{role.level ? ` · ${levelLabel(role.level, copy)}` : ""}</strong>
                {role.teams.length ? <span>{copy.teams}: {role.teams.join(", ")}</span> : null}
                {role.issuer && role.issuer !== "LUFA" ? <span>{role.issuer}</span> : null}
              </div>
              <div>
                <b>{roleStatusText[role.status][locale]}</b>
                {role.validUntil ? <span>{copy.validUntil} {date(role.validUntil, locale)}</span> : null}
              </div>
            </li>
          ))}
        </ul>
        {mode === "holder" && hints.length ? (
          <div className="credential-hints">
            {hints.map((hint) => <p key={hint}>{hint}</p>)}
            {pending.some((role) => role.status === "membership_required") ? <a href="/tienda">{copy.store}</a> : null}
          </div>
        ) : null}
      </section>

      {mode === "holder" ? <div className="credential-buttons">{qr ? <a href={qr} download={`LUFA-${credential.lufaNumber}-QR.png`}>{copy.download}</a> : null}<button type="button" disabled={!qr} onClick={() => window.print()}>{copy.print}</button></div> : null}
    </section>
  );
}
