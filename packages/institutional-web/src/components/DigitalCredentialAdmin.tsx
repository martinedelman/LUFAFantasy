"use client";

import { FormEvent, useEffect, useState } from "react";
import type { DigitalCredentialResponseDto } from "@lufa/contracts";

type CredentialCandidate = {
  id: string;
  fullName: string;
  teamName: string;
  position: string;
  playerStatus: string;
  account: { id: string; name: string; email: string; isActive: boolean } | null;
  activeCredential: DigitalCredentialResponseDto | null;
};

type CredentialsPayload = {
  credentials: DigitalCredentialResponseDto[];
  playerCandidates: CredentialCandidate[];
};

type ApiPayload<T> = { success?: boolean; data?: T; message?: string };

function displayDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", { dateStyle: "medium" }).format(new Date(value));
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const payload = await response.json().catch(() => ({})) as ApiPayload<T>;
  if (!response.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || "No pudimos completar la operación.");
  }
  return payload.data;
}

export default function DigitalCredentialAdmin() {
  const [search, setSearch] = useState("");
  const [data, setData] = useState<CredentialsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageVariant, setMessageVariant] = useState<"error" | "success">("success");

  const load = async (query = "") => {
    setLoading(true);
    try {
      const params = query.trim() ? `?search=${encodeURIComponent(query.trim())}` : "";
      setData(await request<CredentialsPayload>(`/api/admin/digital-credentials${params}`));
    } catch (error) {
      setMessageVariant("error");
      setMessage(error instanceof Error ? error.message : "No pudimos cargar las credenciales.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submitSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    if (search.trim().length < 2) {
      setMessageVariant("error");
      setMessage("Escribí al menos dos letras del nombre o apellido para buscar una ficha.");
      return;
    }
    void load(search);
  };

  const issue = async (candidate: CredentialCandidate) => {
    if (!candidate.account || !candidate.account.isActive || candidate.activeCredential) return;
    if (!window.confirm(`¿Dar de alta como válida la ID digital de ${candidate.fullName}?`)) return;

    setIssuingId(candidate.id);
    setMessage(null);
    try {
      const credential = await request<DigitalCredentialResponseDto>("/api/admin/digital-credentials/issue-player", {
        method: "POST",
        body: JSON.stringify({ playerId: candidate.id }),
      });
      setMessageVariant("success");
      setMessage(`ID digital emitida correctamente: ${credential.memberNumber}.`);
      await load(search);
    } catch (error) {
      setMessageVariant("error");
      setMessage(error instanceof Error ? error.message : "No pudimos emitir la ID digital.");
    } finally {
      setIssuingId(null);
    }
  };

  return (
    <section className="space-y-5">
      <header className="rounded-lg border border-sky-100 bg-sky-50 p-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Credenciales oficiales</p>
        <h2 className="mt-1 text-2xl font-bold text-slate-950">ID Digital</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">
          Buscá la ficha ya cargada de un jugador por nombre y apellido. Al darla de alta, se emite una credencial válida con sus datos deportivos y se habilita en su perfil LUFA.
        </p>
      </header>

      <form onSubmit={submitSearch} className="rounded-lg border border-slate-200 bg-white p-5">
        <label htmlFor="credential-player-search" className="block text-sm font-semibold text-slate-900">
          Buscar jugador
        </label>
        <p className="mt-1 text-sm text-slate-600">Probá con nombre, apellido o ambos. No necesitás cargar una cuenta ni IDs técnicos.</p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            id="credential-player-search"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Ej.: Sofía Rodríguez"
            className="min-w-0 flex-1 rounded-md border border-slate-300 px-3 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-brand-600 focus:ring-2 focus:ring-brand-200"
          />
          <button type="submit" className="rounded-md bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2">
            Buscar ficha
          </button>
        </div>
      </form>

      {message ? (
        <div className={`rounded-lg border p-4 text-sm ${messageVariant === "error" ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"}`} role={messageVariant === "error" ? "alert" : "status"}>
          {message}
        </div>
      ) : null}

      {search.trim().length >= 2 ? (
        <section aria-live="polite" className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-200 px-5 py-4">
            <h3 className="font-semibold text-slate-950">Resultados de la búsqueda</h3>
            <p className="mt-1 text-sm text-slate-600">Elegí una ficha para emitir su ID digital.</p>
          </div>
          {loading ? (
            <p className="p-5 text-sm text-slate-600">Buscando fichas…</p>
          ) : data?.playerCandidates.length ? (
            <ul className="divide-y divide-slate-100">
              {data.playerCandidates.map((candidate) => {
                const canIssue = Boolean(candidate.account?.isActive) && !candidate.activeCredential;
                return (
                  <li key={candidate.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <p className="font-semibold text-slate-950">{candidate.fullName}</p>
                      <p className="mt-1 text-sm text-slate-600">{candidate.teamName} · {candidate.position}</p>
                      {candidate.activeCredential ? (
                        <p className="mt-2 text-sm font-medium text-emerald-700">ID vigente: {candidate.activeCredential.memberNumber}</p>
                      ) : candidate.account?.isActive ? (
                        <p className="mt-2 text-sm text-emerald-700">Cuenta LUFA vinculada y activa.</p>
                      ) : (
                        <p className="mt-2 text-sm text-amber-800">No tiene una cuenta LUFA activa vinculada al email de su ficha.</p>
                      )}
                    </div>
                    <button
                      type="button"
                      disabled={!canIssue || issuingId === candidate.id}
                      onClick={() => void issue(candidate)}
                      className="shrink-0 rounded-md bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-brand-800 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2"
                    >
                      {issuingId === candidate.id ? "Emitiendo…" : candidate.activeCredential ? "ID vigente" : "Dar de alta como válida"}
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="p-5 text-sm text-slate-600">No encontramos fichas con ese nombre. Probá con una parte del nombre o apellido.</p>
          )}
        </section>
      ) : null}

      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="font-semibold text-slate-950">Credenciales emitidas recientemente</h3>
        </div>
        {loading && !data ? (
          <p className="p-5 text-sm text-slate-600">Cargando credenciales…</p>
        ) : data?.credentials.length ? (
          <div className="divide-y divide-slate-100">
            {data.credentials.map((credential) => (
              <article key={credential.id} className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950">{credential.displayName}</p>
                  <p className="mt-1 text-sm text-slate-600">{credential.memberNumber} · vence el {displayDate(credential.expiresAt)}</p>
                </div>
                <span className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${credential.status === "active" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700"}`}>
                  {credential.status === "active" ? "Válida" : credential.status === "revoked" ? "Revocada" : "Vencida"}
                </span>
              </article>
            ))}
          </div>
        ) : (
          <p className="p-5 text-sm text-slate-600">Todavía no se emitieron credenciales.</p>
        )}
      </section>
    </section>
  );
}
