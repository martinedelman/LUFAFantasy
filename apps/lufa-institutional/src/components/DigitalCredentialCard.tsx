"use client";
/* eslint-disable @next/next/no-img-element */

import { type PointerEvent, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import type { DigitalCredentialResponseDto } from "@lufa/contracts";
import "./DigitalCredentialCard.css";

type Locale = "es" | "en";
type CredentialFace = "details" | "qr";

const text = {
  es: {
    title: "ID Digital", official: "CREDENCIAL OFICIAL LUFA", member: "N.º de miembro", role: "Rol", team: "Equipo / Asociación", nationality: "Nacionalidad", birth: "Fecha de nacimiento", issued: "Fecha de emisión", expiry: "Fecha de vencimiento", verified: "Verificada", status: "Estado", qrTitle: "Verificar credencial", qrLead: "Escaneá para verificar la credencial", qrHelp: "Esta credencial se puede verificar en línea en lufa.com.uy", swipe: "Deslizá la tarjeta para ver el QR", details: "Datos", qr: "QR", download: "Descargar QR", print: "Imprimir credencial", language: "English",
  },
  en: {
    title: "Digital Member ID", official: "OFFICIAL LUFA CREDENTIAL", member: "Member ID", role: "Role", team: "Team / Association", nationality: "Nationality", birth: "Date of birth", issued: "Issue date", expiry: "Expiry date", verified: "Verified", status: "Status", qrTitle: "Verify credential", qrLead: "Scan to verify this credential", qrHelp: "This credential can be verified online at lufa.com.uy", swipe: "Swipe the card to view the QR", details: "Details", qr: "QR", download: "Download QR", print: "Print credential", language: "Español",
  },
};

function date(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-UY" : "en-US", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(value));
}

function roleChips(roleLabel: string) {
  const labels = roleLabel
    .split(/[,;/|]/)
    .flatMap((label) => label.split(/\s+·\s+/))
    .map((label) => label.trim())
    .filter(Boolean);
  // Las credenciales anteriores guardaban "Jugador · C". La posición no es un rol.
  const roles = labels.filter((label) => !/^[A-Z]{1,3}(?:\/[A-Z]{1,3})?$/.test(label));

  return [...new Set(roles)];
}

const roleTranslations: Record<string, { es: string; en: string }> = {
  jugador: { es: "Jugador", en: "Player" },
  jugadora: { es: "Jugadora", en: "Player" },
  player: { es: "Jugador", en: "Player" },
  oficial: { es: "Oficial", en: "Official" },
  official: { es: "Oficial", en: "Official" },
  árbitro: { es: "Árbitro", en: "Referee" },
  arbitro: { es: "Árbitro", en: "Referee" },
  referee: { es: "Árbitro", en: "Referee" },
  juez: { es: "Juez", en: "Judge" },
  judge: { es: "Juez", en: "Judge" },
  entrenador: { es: "Entrenador", en: "Coach" },
  entrenadora: { es: "Entrenadora", en: "Coach" },
  coach: { es: "Entrenador", en: "Coach" },
};

function localizedRole(role: string, locale: Locale) {
  const key = role.trim().normalize("NFD").replace(/\p{Diacritic}/gu, "").toLocaleLowerCase("es-UY");
  return roleTranslations[key]?.[locale] || role;
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

export function DigitalCredentialCard({ credential, initialLocale = "es" }: { credential: DigitalCredentialResponseDto; initialLocale?: Locale }) {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [face, setFace] = useState<CredentialFace>("details");
  const [qr, setQr] = useState("");
  const swipeStart = useRef<{ x: number; y: number; pointerId: number } | null>(null);
  const copy = text[locale];
  const roles = roleChips(credential.roleLabel || "");
  const visibleRoles = roles.length
    ? roles
    : [credential.subjectType === "official" ? locale === "es" ? "Oficial" : "Official" : locale === "es" ? "Jugador" : "Player"];

  useEffect(() => {
    const saved = localStorage.getItem("lufa-id-locale");
    if (saved === "es" || saved === "en") setLocale(saved);
  }, []);
  useEffect(() => { localStorage.setItem("lufa-id-locale", locale); }, [locale]);
  useEffect(() => {
    const verifyUrl = `${window.location.origin}/verificar/${credential.publicId}`;
    void createQrWithLogo(verifyUrl).then(setQr).catch(() => { void QRCode.toDataURL(verifyUrl, { width: 560, margin: 2, errorCorrectionLevel: "H" }).then(setQr); });
  }, [credential.publicId]);

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

  return (
    <section className="credential-wrap">
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
              <span className="credential-verified-badge" aria-label={copy.verified}>✓</span>
            </header>
            <section className="credential-identity">
              {credential.profilePicture ? <img src={credential.profilePicture} alt={`Foto de ${credential.displayName}`} /> : <div className="credential-avatar" aria-hidden="true">{credential.displayName.slice(0, 1)}</div>}
              <div className="credential-identity-copy">
                <span>{locale === "es" ? "Nombre completo" : "Full name"}</span>
                <h2>{credential.displayName}</h2>
                <span>{copy.member}</span>
                <b>{credential.memberNumber}</b>
                <div className="credential-role-chips" aria-label={copy.role}>
                  {visibleRoles.map((role) => <span className="credential-role-chip" key={role}>{localizedRole(role, locale)}</span>)}
                </div>
              </div>
            </section>
            <dl className="credential-details">
              <div className="credential-team"><dt>{copy.team}</dt><dd>{credential.organizationName}</dd></div>
              <div className="credential-status"><dt>{copy.status}</dt><dd><span aria-hidden="true">✓</span>{copy.verified}</dd></div>
              <div><dt>{copy.nationality}</dt><dd>{credential.nationalityCode}</dd></div>
              <div><dt>{copy.issued}</dt><dd>{date(credential.issuedAt, locale)}</dd></div>
              <div><dt>{copy.birth}</dt><dd>{date(credential.dateOfBirth, locale)}</dd></div>
              <div><dt>{copy.expiry}</dt><dd>{date(credential.expiresAt, locale)}</dd></div>
            </dl>
          </article>

          <article className="credential-card credential-back" aria-label={`${copy.title}: ${copy.qr}`} aria-hidden={face !== "qr"}>
            <header className="credential-brand-row"><img src="/lufa_icon.png" alt="LUFA" /><div><p>{copy.official}</p><h1>{copy.qrTitle}</h1></div></header>
            <div className="credential-qr-content"><div className="credential-qr-frame">{qr ? <img src={qr} alt={copy.qrLead} /> : <span aria-live="polite">…</span>}</div><h2>{copy.qrLead}</h2><p>{copy.qrHelp}</p><div className="credential-back-member">{credential.memberNumber}</div></div>
          </article>
        </div>
      </div>

      <p className="credential-swipe-hint" aria-live="polite">
        {face === "details"
          ? locale === "es" ? "Deslizá horizontalmente para ver el QR" : "Swipe horizontally to view the QR"
          : locale === "es" ? "Deslizá horizontalmente para volver a los datos" : "Swipe horizontally to return to the details"}
      </p>
      <div className="credential-buttons">{qr ? <a href={qr} download={`LUFA-${credential.memberNumber}-QR.png`}>{copy.download}</a> : null}<button type="button" disabled={!qr} onClick={() => window.print()}>{copy.print}</button></div>
    </section>
  );
}
