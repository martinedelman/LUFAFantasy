"use client";

import { useEffect, useMemo, useState } from "react";
import AdminProtection from "@/components/AdminProtection";
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

    if (!firstName || !lastName) {
      setFormError("Nombre y apellido son requeridos");
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

  return (
    <AdminProtection fallbackMessage="Solo los administradores pueden acceder al panel de administración.">
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-gray-900">Panel de Administración</h1>
            <p className="mt-2 text-sm text-gray-600">Estadísticas generales del sistema y gestión de jueces.</p>
          </header>

          {error ? (
            <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
          ) : loading ? (
            <div className="rounded-lg bg-white p-6 shadow text-gray-600">Cargando datos del panel...</div>
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
                        Nombre
                      </label>
                      <input
                        id="firstName"
                        type="text"
                        value={form.firstName}
                        onChange={(event) => setForm((current) => ({ ...current, firstName: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Ej: Juan"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="lastName" className="mb-1 block text-sm font-medium text-gray-700">
                        Apellido
                      </label>
                      <input
                        id="lastName"
                        type="text"
                        value={form.lastName}
                        onChange={(event) => setForm((current) => ({ ...current, lastName: event.target.value }))}
                        className="w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                        placeholder="Ej: Pérez"
                        required
                      />
                    </div>

                    {formError && <p className="text-sm text-red-600">{formError}</p>}
                    {formSuccess && <p className="text-sm text-green-700">{formSuccess}</p>}

                    <button
                      type="submit"
                      disabled={submitting}
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {submitting ? "Creando..." : "Crear Juez"}
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
