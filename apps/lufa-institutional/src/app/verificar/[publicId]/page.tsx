"use client";

import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import type { DigitalCredentialResponseDto, DigitalCredentialStatus } from "@lufa/contracts";
import { DigitalCredentialCard } from "@/components/DigitalCredentialCard";

export default function VerifyCredentialPage() {
  const params = useParams<{ publicId: string }>(); const search = useSearchParams(); const locale = search.get("lang") === "en" ? "en" : "es";
  const [state, setState] = useState<{ loading: boolean; status: DigitalCredentialStatus; credential: DigitalCredentialResponseDto | null }>({ loading: true, status: "not_found", credential: null });
  useEffect(() => { void fetch(`/api/digital-credentials/verify/${encodeURIComponent(params.publicId)}`, { cache: "no-store" }).then(async (r) => (await r.json()) as { data?: { status: DigitalCredentialStatus; credential: DigitalCredentialResponseDto | null } }).then((data) => setState({ loading: false, status: data.data?.status || "not_found", credential: data.data?.credential || null })).catch(() => setState({ loading: false, status: "not_found", credential: null })); }, [params.publicId]);
  if (state.loading) return <main className="id-page"><p>{locale === "en" ? "Verifying credential…" : "Verificando credencial…"}</p></main>;
  if (!state.credential) return <main className="id-page"><section className="id-empty"><h1>{locale === "en" ? "Credential not valid" : "Credencial no válida"}</h1><p>{state.status === "revoked" ? (locale === "en" ? "This credential was revoked by LUFA." : "Esta credencial fue revocada por LUFA.") : state.status === "expired" ? (locale === "en" ? "This credential has expired." : "Esta credencial venció.") : (locale === "en" ? "We could not find this credential." : "No encontramos esta credencial.")}</p></section></main>;
  return <main className="id-page"><p className="verification-label">{locale === "en" ? "Officially verified by LUFA" : "Verificada oficialmente por LUFA"}</p><DigitalCredentialCard credential={state.credential} initialLocale={locale} /></main>;
}
