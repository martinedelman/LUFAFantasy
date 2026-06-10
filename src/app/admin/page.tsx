"use client";

import { useEffect, useMemo, useState } from "react";
import AdminProtection from "@/components/AdminProtection";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";
import type { AdminSystemStatsResponseDto, ApiResponseDto, CreateJudgeRequestDto, JudgeResponseDto } from "@/app/DTOs";

const emptyStats: AdminSystemStatsResponseDto = {
  totalUsers: 0,
  totalAdmins: 0,
  totalJudges: 0,
  activeTournaments: 0,
  totalTeams: 0,
  totalPlayers: 0,
  totalGames: 0,
  completedGames: 0,
  scheduledGames: 0,
  inProgressGames: 0,
};

export default function AdminPage() {
  const [stats, setStats] = useState<AdminSystemStatsResponseDto>(emptyStats);
  const [judges, setJudges] = useState<JudgeResponseDto[]>([]);
  const [form, setForm] = useState<CreateJudgeRequestDto>({ firstName: "", lastName: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const fetchData = async () => {
    const [statsResponse, judgesResponse] = await Promise.all([
      fetch("/api/admin/stats", { cache: "no-store" }),
      fetch("/api/judges", { cache: "no-store" }),
    ]);

    const statsPayload = (await statsResponse.json()) as ApiResponseDto<AdminSystemStatsResponseDto>;
    const judgesPayload = (await judgesResponse.json()) as ApiResponseDto<JudgeResponseDto[]>;

    if (!statsResponse.ok || !statsPayload.success || !statsPayload.data) {
      throw new Error(statsPayload.message || "No se pudieron cargar las estadísticas del sistema");
    }

    if (!judgesResponse.ok || !judgesPayload.success || !Array.isArray(judgesPayload.data)) {
      throw new Error(judgesPayload.message || "No se pudo cargar la lista de jueces");
    }

    setStats(statsPayload.data);
    setJudges(judgesPayload.data);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        await fetchData();
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Error al cargar el panel");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const handleCreateJudge = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    const nextFieldErrors: Record<string, string> = {};

    if (!firstName) nextFieldErrors.firstName = "Este campo es obligatorio.";
    if (!lastName) nextFieldErrors.lastName = "Este campo es obligatorio.";
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    try {
      setSubmitting(true);

      const response = await fetch("/api/judges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName } satisfies CreateJudgeRequestDto),
      });

      const payload = (await response.json()) as ApiResponseDto<JudgeResponseDto>;

      if (!response.ok || !payload.success || !payload.data) {
        setFormError(payload.message || "No se pudo crear el juez");
        return;
      }

      const createdJudge = payload.data;

      setForm({ firstName: "", lastName: "" });
      setFieldErrors({});
      setJudges((current) =>
        [...current, createdJudge].sort((left, right) =>
          `${left.lastName} ${left.firstName}`.localeCompare(`${right.lastName} ${right.firstName}`, "es", {
            sensitivity: "base",
          }),
        ),
      );
      setStats((current) => ({ ...current, totalJudges: current.totalJudges + 1 }));
      setFormSuccess("Juez creado correctamente");
    } catch {
      setFormError("Error de conexión al crear el juez");
    } finally {
      setSubmitting(false);
    }
  };

  const statCards = useMemo(
    () => [
      { label: "Usuarios", value: stats.totalUsers },
      { label: "Administradores", value: stats.totalAdmins },
      { label: "Jueces", value: stats.totalJudges },
      { label: "Torneos Activos", value: stats.activeTournaments },
      { label: "Equipos", value: stats.totalTeams },
      { label: "Jugadores", value: stats.totalPlayers },
      { label: "Partidos", value: stats.totalGames },
      { label: "Partidos Finalizados", value: stats.completedGames },
      { label: "Partidos Programados", value: stats.scheduledGames },
      { label: "Partidos En Curso", value: stats.inProgressGames },
    ],
    [stats],
  );
  const isJudgeFormReady = form.firstName.trim().length > 0 && form.lastName.trim().length > 0;
  const inputClassName = (fieldName: string) =>
    `w-full rounded-md border px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200 ${
      fieldErrors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-300"
    }`;
  const requiredLabel = (label: string) => (
    <>
      {label} <span className="text-red-600">*</span>
      <span className="ml-1 text-xs font-normal text-gray-500">Obligatorio</span>
    </>
  );

  return (
    <AdminProtection fallbackMessage="Solo los administradores pueden acceder al panel de administración.">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="mt-2 text-sm text-gray-600">Estadísticas generales del sistema y gestión de jueces.</p>
          </header>

          {error ? (
            <InlineFeedback variant="error" title="No pudimos cargar el panel" message={error} />
          ) : loading ? (
            <div className="rounded-lg bg-white p-6 shadow">
              <div className="flex min-h-[220px] items-center justify-center">
                <LoadingSpinner size="lg" />
              </div>
            </div>
          ) : (
            <>
              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
                {statCards.map((card) => (
                  <article key={card.label} className="rounded-lg bg-white p-5 shadow-sm ring-1 ring-gray-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{card.label}</p>
                    <p className="mt-2 text-2xl font-bold text-gray-900">{card.value}</p>
                  </article>
                ))}
              </section>

              <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Crear Juez</h2>
                  <p className="mt-1 text-sm text-gray-600">Ingrese únicamente nombre y apellido.</p>

                  <form className="mt-5 space-y-4" onSubmit={handleCreateJudge}>
                    <div>
                      <label htmlFor="firstName" className="mb-1 block text-sm font-medium text-gray-700">
                        {requiredLabel("Nombre")}
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={form.firstName}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, firstName: event.target.value }));
                          setFieldErrors((current) => ({ ...current, firstName: event.target.value.trim() ? "" : current.firstName }));
                          setFormError(null);
                        }}
                        aria-invalid={Boolean(fieldErrors.firstName)}
                        aria-describedby={fieldErrors.firstName ? "judge-firstName-error" : undefined}
                        className={inputClassName("firstName")}
                        placeholder="Ej: Juan"
                        required
                      />
                      {fieldErrors.firstName && (
                        <span id="judge-firstName-error" className="mt-1 block text-xs font-medium text-red-600">
                          {fieldErrors.firstName}
                        </span>
                      )}
                    </div>

                    <div>
                      <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
                        {requiredLabel("Apellido")}
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={form.lastName}
                        onChange={(event) => {
                          setForm((current) => ({ ...current, lastName: event.target.value }));
                          setFieldErrors((current) => ({ ...current, lastName: event.target.value.trim() ? "" : current.lastName }));
                          setFormError(null);
                        }}
                        aria-invalid={Boolean(fieldErrors.lastName)}
                        aria-describedby={fieldErrors.lastName ? "judge-lastName-error" : undefined}
                        className={inputClassName("lastName")}
                        placeholder="Ej: Pérez"
                        required
                      />
                      {fieldErrors.lastName && (
                        <span id="judge-lastName-error" className="mt-1 block text-xs font-medium text-red-600">
                          {fieldErrors.lastName}
                        </span>
                      )}
                    </div>

                    {formError && (
                      <InlineFeedback compact variant="error" title="No pudimos crear el juez" message={formError} />
                    )}
                    {formSuccess && <InlineFeedback compact variant="success" title="Juez creado" message={formSuccess} />}

                    <button
                      type="submit"
                      disabled={submitting || !isJudgeFormReady}
                      className="inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? (
                        <>
                          <LoadingSpinner size="sm" color="white" />
                          <span>Creando...</span>
                        </>
                      ) : (
                        "Crear Juez"
                      )}
                    </button>
                  </form>
                </article>

                <article className="rounded-lg bg-white p-6 shadow-sm ring-1 ring-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Jueces Registrados</h2>
                  <p className="mt-1 text-sm text-gray-600">{judges.length} jueces cargados</p>

                  <div className="mt-5 max-h-[420px] overflow-auto rounded-md border border-gray-200">
                    {judges.length === 0 ? (
                      <p className="p-4 text-sm text-gray-500">No hay jueces registrados todavía.</p>
                    ) : (
                      <table className="min-w-full divide-y divide-gray-200 text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Nombre</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Apellido</th>
                            <th className="px-4 py-2 text-left font-semibold text-gray-600">Alta</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 bg-white">
                          {judges.map((judge) => (
                            <tr key={judge._id}>
                              <td className="px-4 py-2 text-gray-900">{judge.firstName}</td>
                              <td className="px-4 py-2 text-gray-900">{judge.lastName}</td>
                              <td className="px-4 py-2 text-gray-600">
                                {judge.createdAt ? new Date(judge.createdAt).toLocaleDateString("es-ES") : "-"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </article>
              </section>
            </>
          )}
        </div>
      </div>
    </AdminProtection>
  );
}
