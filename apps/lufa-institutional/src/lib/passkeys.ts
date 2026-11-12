"use client";

import {
  browserSupportsWebAuthn,
  browserSupportsWebAuthnAutofill,
  startAuthentication,
  startRegistration,
  WebAuthnAbortService,
  type PublicKeyCredentialCreationOptionsJSON,
  type PublicKeyCredentialRequestOptionsJSON,
} from "@simplewebauthn/browser";

export type PasskeySummary = {
  id: string;
  name: string;
  createdAt: string;
  lastUsedAt: string | null;
  backedUp: boolean;
  deviceType: string;
};

type ApiPayload<T> = { success?: boolean; message?: string; data?: T };

/** Error con un mensaje que se puede mostrar tal cual al usuario. */
export class PasskeyRequestError extends Error {}

export function passkeysSupported() {
  return typeof window !== "undefined" && browserSupportsWebAuthn();
}

export function passkeyAutofillSupported() {
  return typeof window === "undefined" ? Promise.resolve(false) : browserSupportsWebAuthnAutofill();
}

export function cancelPasskeyCeremony() {
  WebAuthnAbortService.cancelCeremony();
}

/** El usuario cerró el diálogo o la operación fue reemplazada por otra. */
export function isPasskeyCancellation(error: unknown) {
  if (!(error instanceof Error)) return false;
  const code = (error as Error & { code?: string }).code;
  return error.name === "NotAllowedError" || error.name === "AbortError" || code === "ERROR_CEREMONY_ABORTED";
}

async function postJson<T>(url: string, body: unknown = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch {
    throw new PasskeyRequestError("No pudimos conectarnos. Revisá tu conexión y probá nuevamente.");
  }
  const payload = (await response.json().catch(() => null)) as ApiPayload<T> | null;
  if (!response.ok || !payload?.success) {
    throw new PasskeyRequestError(payload?.message || "No pudimos completar la operación con la passkey.");
  }
  return payload.data as T;
}

export function guessDeviceName() {
  if (typeof navigator === "undefined") return "Passkey";
  const agent = navigator.userAgent;
  if (/iPhone/i.test(agent)) return "iPhone";
  if (/iPad/i.test(agent)) return "iPad";
  if (/Android/i.test(agent)) return "Android";
  if (/Macintosh|Mac OS X/i.test(agent)) return navigator.maxTouchPoints > 1 ? "iPad" : "Mac";
  if (/Windows/i.test(agent)) return "Windows";
  if (/CrOS/i.test(agent)) return "Chromebook";
  if (/Linux/i.test(agent)) return "Linux";
  return "Passkey";
}

/** Registra una passkey nueva para el usuario con sesión iniciada. */
export async function registerPasskey(): Promise<PasskeySummary> {
  const optionsJSON = await postJson<PublicKeyCredentialCreationOptionsJSON>("/api/auth/passkeys/registration/options");
  const response = await startRegistration({ optionsJSON });
  return postJson<PasskeySummary>("/api/auth/passkeys/registration/verify", { response, name: guessDeviceName() });
}

/**
 * Inicia sesión con una passkey. Con `autofill` el navegador la ofrece desde el
 * campo de email (conditional UI) y la promesa queda pendiente hasta que el usuario elige una.
 */
export async function signInWithPasskey({ autofill = false }: { autofill?: boolean } = {}): Promise<void> {
  const optionsJSON = await postJson<PublicKeyCredentialRequestOptionsJSON>("/api/auth/passkeys/authentication/options");
  const response = await startAuthentication({ optionsJSON, useBrowserAutofill: autofill });
  await postJson("/api/auth/passkeys/authentication/verify", { response });
}

export function passkeyErrorMessage(error: unknown, fallback: string) {
  return error instanceof PasskeyRequestError ? error.message : fallback;
}
