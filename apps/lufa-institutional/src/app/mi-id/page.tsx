"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { DigitalCredentialResponseDto } from "@lufa/contracts";
import { DigitalCredentialCard } from "@/components/DigitalCredentialCard";

export default function MyDigitalIdPage() {
  const [state, setState] = useState<{ loading: boolean; credential: DigitalCredentialResponseDto | null; error: string }>({ loading: true, credential: null, error: "" });
  useEffect(() => { void fetch("/api/digital-credentials/me", { cache: "no-store" }).then(async (r) => ({ ok: r.ok, data: await r.json() as { data?: DigitalCredentialResponseDto | null; message?: string } })).then(({ ok, data }) => setState({ loading: false, credential: ok ? data.data || null : null, error: ok ? "" : data.message || "Iniciá sesión para ver tu ID digital." })).catch(() => setState({ loading: false, credential: null, error: "No pudimos cargar tu ID digital." })); }, []);
  return <main className="id-page"><Link href="/" className="id-back">← LUFA</Link>{state.loading ? <p>Cargando ID digital…</p> : state.credential ? <DigitalCredentialCard credential={state.credential} /> : <section className="id-empty"><h1>Mi ID Digital</h1><p>{state.error || "Todavía no tenés una credencial emitida. Contactá a LUFA para solicitarla."}</p><Link href="/">Volver al inicio</Link></section>}</main>;
}
