"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { PublicDigitalCredentialResponseDto } from "@lufa/contracts";
import { DigitalCredentialCard, type SignatureState } from "@/components/DigitalCredentialCard";

type Jwk = JsonWebKey & { kid?: string };

function decodeSegment(segment: string) {
  const base64 = segment.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(segment.length / 4) * 4, "=");
  return Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
}

/** Comprueba en el dispositivo la firma Ed25519 que viaja en el fragmento del QR (nunca llega al servidor). */
async function checkSignature(token: string, publicId: string): Promise<SignatureState> {
  const parts = token.split(".");
  if (parts.length !== 3) return "invalid";
  try {
    const header = JSON.parse(new TextDecoder().decode(decodeSegment(parts[0]!))) as { alg?: string; kid?: string };
    const payload = JSON.parse(new TextDecoder().decode(decodeSegment(parts[1]!))) as { sub?: string; exp?: number };
    if (header.alg !== "EdDSA" || payload.sub !== publicId || (payload.exp && payload.exp * 1000 < Date.now())) return "invalid";
    const jwks = await fetch("/.well-known/lufa-id-jwks.json", { cache: "no-store" }).then((response) => response.json() as Promise<{ keys?: Jwk[] }>);
    const jwk = jwks.keys?.find((key) => key.kid === header.kid);
    if (!jwk) return jwks.keys?.length ? "invalid" : "unavailable";
    if (!globalThis.crypto?.subtle) return "unsupported";
    let key: CryptoKey;
    try {
      key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, { name: "Ed25519" }, false, ["verify"]);
    } catch {
      return "unsupported";
    }
    const valid = await crypto.subtle.verify({ name: "Ed25519" }, key, decodeSegment(parts[2]!), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
    return valid ? "valid" : "invalid";
  } catch {
    return "invalid";
  }
}

const invalidText = {
  es: { title: "Credencial no válida", revoked: "Esta credencial fue revocada por LUFA.", expired: "Esta credencial venció.", suspended: "La membresía de esta persona está suspendida por LUFA.", not_found: "No encontramos esta credencial.", checking: "Verificando credencial…", error: "No pudimos verificar la credencial. Probá de nuevo." },
  en: { title: "Credential not valid", revoked: "This credential was revoked by LUFA.", expired: "This credential has expired.", suspended: "This person's membership is suspended by LUFA.", not_found: "We could not find this credential.", checking: "Verifying credential…", error: "We could not verify the credential. Please try again." },
};

export default function VerifyCredentialPage() {
  const params = useParams<{ publicId: string }>(); const search = useSearchParams(); const locale = search.get("lang") === "en" ? "en" : "es";
  const copy = invalidText[locale];
  const [state, setState] = useState<{ loading: boolean; failed?: boolean; data?: PublicDigitalCredentialResponseDto }>({ loading: true });
  const [signature, setSignature] = useState<SignatureState>("checking");

  useEffect(() => {
    void fetch(`/api/digital-credentials/verify/${encodeURIComponent(params.publicId)}`, { cache: "no-store" })
      .then(async (response) => ({ ok: response.ok, body: await response.json() as { data?: PublicDigitalCredentialResponseDto } }))
      .then(({ ok, body }) => setState(ok && body.data ? { loading: false, data: body.data } : { loading: false, failed: true }))
      .catch(() => setState({ loading: false, failed: true }));
    const token = window.location.hash.slice(1);
    if (!token) setSignature("unavailable");
    else void checkSignature(token, params.publicId).then(setSignature);
  }, [params.publicId]);

  if (state.loading) return <main className="id-page"><p>{copy.checking}</p></main>;
  const data = state.data;
  if (!data?.credential) {
    const reason = state.failed ? copy.error : data?.status === "revoked" ? copy.revoked : data?.status === "expired" ? copy.expired : data?.status === "suspended" ? copy.suspended : copy.not_found;
    return <main className="id-page"><section className="id-empty" role="alert"><h1>{copy.title}</h1><p>{reason}</p></section></main>;
  }
  return <main className="id-page"><DigitalCredentialCard credential={data.credential} initialLocale={locale} mode="verification" checkedAt={data.checkedAt} signature={signature} /></main>;
}
