"use client";

import { useCallback, useEffect, useState } from "react";
import {
  isPasskeyCancellation,
  passkeyErrorMessage,
  passkeysSupported,
  registerPasskey,
  type PasskeySummary,
} from "@/lib/passkeys";
import "./PasskeySettings.css";

type Feedback = { tone: "error" | "success"; message: string } | null;

const dateFormat = new Intl.DateTimeFormat("es-UY", { day: "numeric", month: "short", year: "numeric" });

function formatDate(value: string | null) {
  return value ? dateFormat.format(new Date(value)) : null;
}

/** Administración de passkeys de la cuenta. No se muestra sin sesión. */
export function PasskeySettings() {
  const [passkeys, setPasskeys] = useState<PasskeySummary[] | null>(null);
  const [available, setAvailable] = useState(true);
  const [supported, setSupported] = useState(false);
  const [pending, setPending] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/passkeys", { cache: "no-store" });
      if (response.status === 401) {
        setAvailable(false);
        return;
      }
      const payload = (await response.json()) as { success?: boolean; data?: PasskeySummary[] };
      if (!response.ok || !payload.success) {
        setAvailable(false);
        return;
      }
      setPasskeys(payload.data || []);
    } catch {
      setAvailable(false);
    }
  }, []);

  useEffect(() => {
    setSupported(passkeysSupported());
    void load();
  }, [load]);

  async function add() {
    setPending("add");
    setFeedback(null);
    try {
      const passkey = await registerPasskey();
      setPasskeys((current) => [...(current || []), passkey]);
      setFeedback({ tone: "success", message: "Passkey agregada. La próxima vez podés ingresar con ella." });
    } catch (error) {
      if (!isPasskeyCancellation(error)) {
        setFeedback({ tone: "error", message: passkeyErrorMessage(error, "No pudimos agregar la passkey. Probá nuevamente.") });
      }
    } finally {
      setPending(null);
    }
  }

  async function remove(passkey: PasskeySummary) {
    if (!window.confirm(`¿Eliminar la passkey "${passkey.name}"? Vas a poder seguir ingresando con tu contraseña.`)) return;
    setPending(passkey.id);
    setFeedback(null);
    try {
      const response = await fetch(`/api/auth/passkeys/${encodeURIComponent(passkey.id)}`, { method: "DELETE" });
      const payload = (await response.json().catch(() => null)) as { success?: boolean; message?: string } | null;
      if (!response.ok || !payload?.success) {
        setFeedback({ tone: "error", message: payload?.message || "No pudimos eliminar la passkey." });
        return;
      }
      setPasskeys((current) => (current || []).filter((item) => item.id !== passkey.id));
      setFeedback({ tone: "success", message: "Passkey eliminada." });
    } catch {
      setFeedback({ tone: "error", message: "No pudimos eliminar la passkey. Revisá tu conexión." });
    } finally {
      setPending(null);
    }
  }

  if (!available || passkeys === null) return null;

  return (
    <section className="passkeys" aria-labelledby="passkeys-title">
      <div className="passkeys-header">
        <div>
          <h2 id="passkeys-title">Passkeys</h2>
          <p>Ingresá con la huella, la cara o el PIN de tu dispositivo. Tu contraseña sigue funcionando.</p>
        </div>
        {supported ? (
          <button type="button" className="passkeys-add" onClick={add} disabled={pending !== null}>
            {pending === "add" ? "Esperando…" : "Agregar passkey"}
          </button>
        ) : null}
      </div>
      {feedback ? (
        <p className={`passkeys-feedback ${feedback.tone}`} role={feedback.tone === "error" ? "alert" : "status"}>
          {feedback.message}
        </p>
      ) : null}
      {!supported ? <p className="passkeys-empty">Este navegador no admite passkeys.</p> : null}
      {passkeys.length ? (
        <ul className="passkeys-list">
          {passkeys.map((passkey) => (
            <li key={passkey.id}>
              <div>
                <strong>{passkey.name}</strong>
                <span>
                  Agregada el {formatDate(passkey.createdAt)}
                  {passkey.lastUsedAt ? ` · Último uso: ${formatDate(passkey.lastUsedAt)}` : " · Sin usar todavía"}
                </span>
              </div>
              <button type="button" onClick={() => remove(passkey)} disabled={pending !== null}>
                {pending === passkey.id ? "Eliminando…" : "Eliminar"}
              </button>
            </li>
          ))}
        </ul>
      ) : supported ? (
        <p className="passkeys-empty">Todavía no agregaste ninguna passkey.</p>
      ) : null}
    </section>
  );
}
