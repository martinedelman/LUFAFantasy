"use client";

import { useEffect, useMemo, useState } from "react";
import AdminProtection from "@/components/AdminProtection";
import InlineFeedback from "@/components/InlineFeedback";

interface PlayerRegistration {
  id: string;
  interestType: "play" | "child";
  interestLabel: string;
  name: string;
  ageRange: string;
  location: string;
  whatsapp: string;
  whatsappDigits: string;
  experience: string;
  createdAt: string;
}

const defaultMessage =
  "Hola {nombre}, te escribimos de LUFA Flag por tu inscripción para jugar. Queremos contarte los próximos pasos para sumarte a juveniles.";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("es-UY", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function normalizeWhatsAppPhone(value: string) {
  const digits = value.replace(/\D/g, "");

  if (digits.startsWith("598")) return digits;
  if (digits.startsWith("0") && digits.length === 9) return `598${digits.slice(1)}`;
  if (digits.length === 8 || digits.length === 9) return `598${digits}`;

  return digits;
}

function applyMessageTemplate(template: string, registration: PlayerRegistration) {
  return template
    .replaceAll("{nombre}", registration.name)
    .replaceAll("{ubicacion}", registration.location)
    .replaceAll("{edad}", registration.ageRange)
    .replaceAll("{experiencia}", registration.experience || "Sin experiencia indicada");
}

function buildWhatsAppUrl(registration: PlayerRegistration, messageTemplate: string) {
  const phone = normalizeWhatsAppPhone(registration.whatsappDigits || registration.whatsapp);
  const message = applyMessageTemplate(messageTemplate, registration);
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

function PlayerRegistrationsContent() {
  const [registrations, setRegistrations] = useState<PlayerRegistration[]>([]);
  const [messageTemplate, setMessageTemplate] = useState(defaultMessage);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const fetchRegistrations = async () => {
      try {
        setStatus("loading");
        const response = await fetch("/api/flag-interest/player-registrations", {
          cache: "no-store",
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          success?: boolean;
          data?: PlayerRegistration[];
          settings?: {
            whatsappMessageTemplate?: string;
          };
          message?: string;
        };

        if (!response.ok || !payload.success || !Array.isArray(payload.data)) {
          throw new Error(payload.message || "No pudimos cargar los jugadores inscriptos.");
        }

        setRegistrations(payload.data);
        if (payload.settings?.whatsappMessageTemplate) {
          setMessageTemplate(payload.settings.whatsappMessageTemplate);
        }
        setStatus("ready");
      } catch (fetchError) {
        if ((fetchError as Error).name === "AbortError") return;
        setError(fetchError instanceof Error ? fetchError.message : "No pudimos cargar los jugadores inscriptos.");
        setStatus("error");
      }
    };

    fetchRegistrations();

    return () => {
      controller.abort();
    };
  }, []);

  const totalPlayers = registrations.length;
  const underagePlayers = useMemo(
    () => registrations.filter((registration) => registration.ageRange === "Menor de 18").length,
    [registrations],
  );

  return (
    <main className="min-h-screen bg-slate-50 text-slate-950">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-8 sm:px-6 lg:px-8">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700">Juveniles</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Jugadores inscriptos</h1>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">Total</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{totalPlayers}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <p className="text-sm font-medium text-slate-600">Menores de 18</p>
              <p className="mt-1 text-3xl font-bold text-slate-950">{underagePlayers}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-lg border border-slate-200 bg-white p-5">
          <label htmlFor="automatic-whatsapp-message" className="text-sm font-semibold text-slate-800">
            Mensaje automático de WhatsApp
          </label>
          <textarea
            id="automatic-whatsapp-message"
            value={messageTemplate}
            onChange={(event) => setMessageTemplate(event.target.value)}
            rows={4}
            className="mt-3 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm leading-6 text-slate-900 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
          <p className="mt-2 text-xs text-slate-500">
            Variables: {"{nombre}"}, {"{ubicacion}"}, {"{edad}"}, {"{experiencia}"}.
          </p>
        </div>

        {status === "loading" && (
          <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
            Cargando jugadores inscriptos...
          </div>
        )}

        {status === "error" && (
          <InlineFeedback
            variant="error"
            title="No pudimos cargar los jugadores inscriptos"
            message={error || "Intentá nuevamente en unos minutos."}
          />
        )}

        {status === "ready" && registrations.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <h2 className="text-xl font-semibold text-slate-950">Todavía no hay jugadores inscriptos</h2>
            <p className="mt-2 text-sm text-slate-600">Los formularios enviados desde Sumate van a aparecer acá.</p>
          </div>
        )}

        {status === "ready" && registrations.length > 0 && (
          <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
            <div className="hidden grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.8fr_0.8fr] gap-4 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 md:grid">
              <span>Nombre</span>
              <span>Edad</span>
              <span>Ubicación</span>
              <span>Experiencia</span>
              <span>Fecha</span>
              <span className="text-right">Acción</span>
            </div>
            <div className="divide-y divide-slate-200">
              {registrations.map((registration) => (
                <article
                  key={registration.id}
                  className="grid gap-4 px-4 py-4 md:grid-cols-[1.2fr_0.8fr_0.8fr_0.9fr_0.8fr_0.8fr] md:items-center"
                >
                  <div>
                    <p className="font-semibold text-slate-950">{registration.name}</p>
                    <p className="mt-1 text-sm text-slate-500">{registration.interestLabel}</p>
                    <p className="mt-1 text-sm text-slate-500 md:hidden">{registration.whatsapp}</p>
                  </div>
                  <p className="text-sm text-slate-700">{registration.ageRange}</p>
                  <p className="text-sm text-slate-700">{registration.location}</p>
                  <p className="text-sm text-slate-700">{registration.experience || "Sin indicar"}</p>
                  <p className="text-sm text-slate-600">{formatDate(registration.createdAt)}</p>
                  <div className="md:text-right">
                    <a
                      href={buildWhatsAppUrl(registration, messageTemplate)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex min-h-10 items-center justify-center rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 focus-visible:ring-offset-2"
                    >
                      Enviar WhatsApp
                    </a>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function PlayerRegistrationsPage() {
  return (
    <AdminProtection
      allowedRoles={["admin", "entrenador_juveniles"]}
      fallbackMessage="Solo los entrenadores juveniles pueden acceder al listado de jugadores inscriptos."
    >
      <PlayerRegistrationsContent />
    </AdminProtection>
  );
}
