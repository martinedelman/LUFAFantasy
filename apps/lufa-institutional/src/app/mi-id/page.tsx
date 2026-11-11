"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DigitalCredentialResponseDto } from "@lufa/contracts";
import { DigitalCredentialCard } from "@/components/DigitalCredentialCard";

const cardProblems: Partial<Record<DigitalCredentialResponseDto["status"], string>> = {
  revoked: "Tu ID digital fue revocada por LUFA. Si creés que es un error, contactá a LUFA.",
  expired: "Tu ID digital venció. Renovala con la inscripción a un torneo en la tienda o contactá a LUFA.",
  suspended: "Tu membresía LUFA está suspendida. Contactá a LUFA para más información.",
};

export default function MyDigitalIdPage() {
  const [state, setState] = useState<{ loading: boolean; credential: DigitalCredentialResponseDto | null; error: string }>({ loading: true, credential: null, error: "" });
  useEffect(() => { void fetch("/api/digital-credentials/me", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, data: await r.json() as { data?: DigitalCredentialResponseDto | null; message?: string } })).then(({ ok, data }) => setState({ loading: false, credential: ok ? data.data || null : null, error: ok ? "" : data.message || "Iniciá sesión para ver tu ID digital." })).catch(() => setState({ loading: false, credential: null, error: "No pudimos cargar tu ID digital." })); }, []);
  const credential = state.credential;
  const problem = credential ? cardProblems[credential.status] : undefined;
  return <main className="id-page"><Link href="/" className="id-back">← LUFA</Link>{state.loading ? <p>Cargando ID digital…</p> : credential && !problem ? <DigitalCredentialCard credential={credential} /> : <section className="id-empty"><h1>Mi ID Digital</h1><p>{problem || state.error || "Todavía no tenés una credencial emitida. Se emite al inscribirte a un torneo en la tienda, o podés solicitarla a LUFA."}</p>{credential ? <p>N.º LUFA {credential.lufaNumber}</p> : null}<Link href="/tienda">Ir a la tienda</Link> · <Link href="/">Volver al inicio</Link></section>}</main>;
}
