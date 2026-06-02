"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

interface DivisionOption {
  _id: string;
  name: string;
  category: "masculino" | "femenino" | "mixto";
  ageGroup?: string;
}

interface TeamOption {
  _id: string;
  name: string;
  shortName?: string;
  division: string | { _id: string };
}

interface TournamentFormData {
  name: string;
  description: string;
  season: string;
  year: number;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  format: "league" | "playoff" | "tournament";
  status: "upcoming" | "active" | "completed" | "cancelled";
  rules: {
    gameDuration: number;
    quarters: number;
    timeoutsPerTeam: number;
    playersPerTeam: number;
    minimumPlayers: number;
    overtimeRules: string;
    scoringRules: {
      touchdown: number;
      extraPoint1Yard: number;
      extraPoint5Yard: number;
      extraPoint10Yard: number;
      safety: number;
      fieldGoal: number;
    };
  };
  prizes: Array<{
    description: string;
    condition: string;
    amount: number;
  }>;
  divisions: string[];
  participatingTeams: string[];
}

const defaultForm: TournamentFormData = {
  name: "",
  description: "",
  season: "Apertura",
  year: new Date().getFullYear(),
  startDate: "",
  endDate: "",
  registrationDeadline: "",
  format: "league",
  status: "upcoming",
  rules: {
    gameDuration: 40,
    quarters: 4,
    timeoutsPerTeam: 3,
    playersPerTeam: 7,
    minimumPlayers: 5,
    overtimeRules: "",
    scoringRules: {
      touchdown: 6,
      extraPoint1Yard: 1,
      extraPoint5Yard: 2,
      extraPoint10Yard: 3,
      safety: 2,
      fieldGoal: 3,
    },
  },
  prizes: [],
  divisions: [],
  participatingTeams: [],
};

function toDateInputValue(value?: string) {
  if (!value) return "";
  return new Date(value).toISOString().split("T")[0];
}

export default function EditTournamentPage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState<TournamentFormData>(defaultForm);
  const [availableDivisions, setAvailableDivisions] = useState<DivisionOption[]>([]);
  const [loadingDivisions, setLoadingDivisions] = useState(true);
  const [availableTeams, setAvailableTeams] = useState<TeamOption[]>([]);
  const [loadingTeams, setLoadingTeams] = useState(true);

  const tournamentId = params?.id as string;

  useEffect(() => {
    const fetchTournament = async () => {
      if (!tournamentId) return;

      try {
        setLoading(true);
        const response = await fetch(`/api/tournaments/${tournamentId}`);
        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.message || "No se pudo cargar el torneo");
        }

        const tournament = result.data;
        setFormData({
          name: tournament.name ?? "",
          description: tournament.description ?? "",
          season: tournament.season ?? "Apertura",
          year: tournament.year ?? new Date().getFullYear(),
          startDate: toDateInputValue(tournament.startDate),
          endDate: toDateInputValue(tournament.endDate),
          registrationDeadline: toDateInputValue(tournament.registrationDeadline),
          format: tournament.format,
          status: tournament.status,
          rules: {
            gameDuration: tournament.rules?.gameDuration ?? 40,
            quarters: tournament.rules?.quarters ?? 4,
            timeoutsPerTeam: tournament.rules?.timeoutsPerTeam ?? 3,
            playersPerTeam: tournament.rules?.playersPerTeam ?? 7,
            minimumPlayers: tournament.rules?.minimumPlayers ?? 5,
            overtimeRules: tournament.rules?.overtimeRules ?? "",
            scoringRules: {
              touchdown: tournament.rules?.scoringRules?.touchdown ?? 6,
              extraPoint1Yard: tournament.rules?.scoringRules?.extraPoint1Yard ?? 1,
              extraPoint5Yard: tournament.rules?.scoringRules?.extraPoint5Yard ?? 2,
              extraPoint10Yard: tournament.rules?.scoringRules?.extraPoint10Yard ?? 3,
              safety: tournament.rules?.scoringRules?.safety ?? 2,
              fieldGoal: tournament.rules?.scoringRules?.fieldGoal ?? 3,
            },
          },
          prizes:
            tournament.prizes?.map(
              (prize: { description: string; condition?: string; amount?: number; position?: number }) => ({
                description: prize.description,
                condition: prize.condition ?? (prize.position ? `${prize.position}° lugar` : ""),
                amount: prize.amount ?? 0,
              }),
            ) ?? [],
          divisions: tournament.divisions?.map((division: { _id: string }) => division._id) ?? [],
          participatingTeams:
            tournament.participatingTeams?.map((team: string | { _id: string }) =>
              typeof team === "string" ? team : team._id,
            ) ?? [],
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al cargar el torneo");
      } finally {
        setLoading(false);
      }
    };

    fetchTournament();
  }, [tournamentId]);

  useEffect(() => {
    const fetchDivisions = async () => {
      try {
        const response = await fetch("/api/divisions?limit=200");
        const result = await response.json();

        if (response.ok && result.success) {
          setAvailableDivisions(result.data);
        }
      } catch {
        setAvailableDivisions([]);
      } finally {
        setLoadingDivisions(false);
      }
    };

    fetchDivisions();
  }, []);

  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const response = await fetch("/api/teams?limit=500");
        const result = await response.json();

        if (response.ok && result.success) {
          setAvailableTeams(result.data);
        }
      } catch {
        setAvailableTeams([]);
      } finally {
        setLoadingTeams(false);
      }
    };

    fetchTeams();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (name.includes(".")) {
      const [parent, child] = name.split(".");
      if (parent === "rules") {
        setFormData((prev) => ({
          ...prev,
          rules: {
            ...prev.rules,
            [child]: type === "number" ? Number(value) : value,
          },
        }));
      }
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? Number(value) : value,
    }));
  };

  const handleScoringRuleChange = (rule: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      rules: {
        ...prev.rules,
        scoringRules: {
          ...prev.rules.scoringRules,
          [rule]: value,
        },
      },
    }));
  };

  const handlePrizeChange = (index: number, field: string, value: string | number) => {
    setFormData((prev) => ({
      ...prev,
      prizes: prev.prizes.map((prize, i) =>
        i === index ? { ...prize, [field]: field === "amount" ? Number(value) : value } : prize,
      ),
    }));
  };

  const addPrize = () => {
    setFormData((prev) => ({
      ...prev,
      prizes: [...prev.prizes, { description: "", condition: "", amount: 0 }],
    }));
  };

  const removePrize = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      prizes: prev.prizes.filter((_, i) => i !== index),
    }));
  };

  const handleDivisionToggle = (divisionId: string) => {
    setFormData((prev) => {
      const nextDivisions = prev.divisions.includes(divisionId)
        ? prev.divisions.filter((id) => id !== divisionId)
        : [...prev.divisions, divisionId];

      const nextParticipatingTeams = prev.participatingTeams.filter((teamId) => {
        const team = availableTeams.find((availableTeam) => availableTeam._id === teamId);
        if (!team) return false;

        const teamDivisionId = typeof team.division === "string" ? team.division : team.division?._id;
        return nextDivisions.includes(teamDivisionId);
      });

      return {
        ...prev,
        divisions: nextDivisions,
        participatingTeams: nextParticipatingTeams,
      };
    });
  };

  const handleTeamToggle = (teamId: string) => {
    setFormData((prev) => ({
      ...prev,
      participatingTeams: prev.participatingTeams.includes(teamId)
        ? prev.participatingTeams.filter((id) => id !== teamId)
        : [...prev.participatingTeams, teamId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (formData.divisions.length === 0) {
      setError("Debes seleccionar al menos una división");
      return;
    }

    if (formData.participatingTeams.length === 0) {
      setError("Debes seleccionar al menos un equipo participante");
      return;
    }

    try {
      setSaving(true);
      setError("");

      const response = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.message || "No se pudo actualizar el torneo");
      }

      router.push(`/tournaments/${tournamentId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al actualizar torneo");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Acceso restringido</h2>
          <p className="text-gray-600 mb-4">Solo administradores pueden editar torneos.</p>
          <Link href="/tournaments" className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md">
            Volver a Torneos
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const filteredTeamsByDivision = availableDivisions
    .filter((division) => formData.divisions.includes(division._id))
    .map((division) => ({
      division,
      teams: availableTeams.filter((team) => {
        const teamDivisionId = typeof team.division === "string" ? team.division : team.division?._id;
        return teamDivisionId === division._id;
      }),
    }));

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Editar Torneo</h1>
              <p className="mt-1 text-sm text-gray-600">Actualiza la información del torneo</p>
            </div>
            <Link
              href={`/tournaments/${tournamentId}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              ← Volver al Detalle
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Información Básica</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Torneo *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="season" className="block text-sm font-medium text-gray-700 mb-2">
                  Temporada *
                </label>
                <select
                  id="season"
                  name="season"
                  required
                  value={formData.season}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="Apertura">Apertura</option>
                  <option value="Clausura">Clausura</option>
                  <option value="Anual">Anual</option>
                  <option value="Verano">Verano</option>
                  <option value="Invierno">Invierno</option>
                </select>
              </div>
              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                  Año *
                </label>
                <input
                  id="year"
                  name="year"
                  type="number"
                  min="2026"
                  max="2100"
                  disabled={true}
                  required
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed"
                />
              </div>
              <div>
                <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
                  Formato *
                </label>
                <select
                  id="format"
                  name="format"
                  value={formData.format}
                  disabled={true}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:cursor-not-allowed"
                >
                  <option value="league">Liga Regular</option>
                  <option value="playoff">Playoff</option>
                  <option value="tournament">Torneo</option>
                </select>
              </div>
              <div>
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-2">
                  Estado *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="upcoming">Próximo</option>
                  <option value="active">Activo</option>
                  <option value="completed">Completado</option>
                  <option value="cancelled">Cancelado</option>
                </select>
              </div>
            </div>
            <div className="mt-6">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Descripción
              </label>
              <textarea
                id="description"
                name="description"
                rows={4}
                value={formData.description}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Fechas</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="registrationDeadline" className="block text-sm font-medium text-gray-700 mb-2">
                  Registro *
                </label>
                <input
                  id="registrationDeadline"
                  name="registrationDeadline"
                  type="date"
                  required
                  value={formData.registrationDeadline}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Inicio *
                </label>
                <input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fin *
                </label>
                <input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Reglas y Puntuación</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label htmlFor="gameDuration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duración del Juego (minutos)
                </label>
                <input
                  id="gameDuration"
                  name="rules.gameDuration"
                  type="number"
                  min="1"
                  value={formData.rules.gameDuration}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="quarters" className="block text-sm font-medium text-gray-700 mb-2">
                  Cantidad de tiempos
                </label>
                <input
                  id="quarters"
                  name="rules.quarters"
                  type="number"
                  min="1"
                  value={formData.rules.quarters}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="timeoutsPerTeam" className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempos Fuera por Equipo
                </label>
                <input
                  id="timeoutsPerTeam"
                  name="rules.timeoutsPerTeam"
                  type="number"
                  min="0"
                  value={formData.rules.timeoutsPerTeam}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="playersPerTeam" className="block text-sm font-medium text-gray-700 mb-2">
                  Jugadores por Equipo
                </label>
                <input
                  id="playersPerTeam"
                  name="rules.playersPerTeam"
                  type="number"
                  min="1"
                  value={formData.rules.playersPerTeam}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label htmlFor="minimumPlayers" className="block text-sm font-medium text-gray-700 mb-2">
                  Mínimo de Jugadores
                </label>
                <input
                  id="minimumPlayers"
                  name="rules.minimumPlayers"
                  type="number"
                  min="1"
                  value={formData.rules.minimumPlayers}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div className="md:col-span-2 lg:col-span-3">
                <label htmlFor="overtimeRules" className="block text-sm font-medium text-gray-700 mb-2">
                  Reglas de Tiempo Extra
                </label>
                <textarea
                  id="overtimeRules"
                  name="rules.overtimeRules"
                  rows={3}
                  value={formData.rules.overtimeRules}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mt-8 mb-4">Sistema de Puntuación</h3>
            <div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Touchdown</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rules.scoringRules.touchdown}
                  onChange={(e) => handleScoringRuleChange("touchdown", Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extra Point (1 yarda)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rules.scoringRules.extraPoint1Yard}
                  onChange={(e) => handleScoringRuleChange("extraPoint1Yard", Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extra Point (5 yardas)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rules.scoringRules.extraPoint5Yard}
                  onChange={(e) => handleScoringRuleChange("extraPoint5Yard", Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Extra Point (10 yardas)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rules.scoringRules.extraPoint10Yard}
                  onChange={(e) => handleScoringRuleChange("extraPoint10Yard", Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Safety</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rules.scoringRules.safety}
                  onChange={(e) => handleScoringRuleChange("safety", Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Goal</label>
                <input
                  type="number"
                  min="0"
                  value={formData.rules.scoringRules.fieldGoal}
                  onChange={(e) => handleScoringRuleChange("fieldGoal", Number(e.target.value))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Premios</h2>
              <button
                type="button"
                onClick={addPrize}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-md text-sm font-medium transition-colors"
              >
                + Agregar Premio
              </button>
            </div>

            {formData.prizes.length === 0 ? (
              <p className="text-sm text-gray-500">Aún no hay premios definidos para este torneo.</p>
            ) : (
              <div className="space-y-4">
                {formData.prizes.map((prize, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border border-gray-200 rounded-lg"
                  >
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premio</label>
                      <input
                        type="text"
                        value={prize.description}
                        onChange={(e) => handlePrizeChange(index, "description", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Ej: Medalla, entrada, beca"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Condición</label>
                      <input
                        type="text"
                        value={prize.condition}
                        onChange={(e) => handlePrizeChange(index, "condition", e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Ej: Ganar final, MVP, Fair Play"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Premio ($)</label>
                      <div className="flex space-x-2">
                        <input
                          type="number"
                          min="0"
                          value={prize.amount}
                          onChange={(e) => handlePrizeChange(index, "amount", e.target.value)}
                          className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                          placeholder="0"
                        />
                        {formData.prizes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removePrize(index)}
                            className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-md text-sm transition-colors"
                            title="Eliminar premio"
                          >
                            ×
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Divisiones</h2>
            {loadingDivisions ? (
              <p className="text-sm text-gray-500">Cargando divisiones...</p>
            ) : availableDivisions.length === 0 ? (
              <p className="text-sm text-gray-500">No hay divisiones disponibles para asignar.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {availableDivisions.map((division) => {
                  const checked = formData.divisions.includes(division._id);

                  return (
                    <label
                      key={division._id}
                      className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => handleDivisionToggle(division._id)}
                        className="h-4 w-4 text-green-600 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-900">{division.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {division.category}
                          {division.ageGroup ? ` • ${division.ageGroup}` : ""}
                        </p>
                      </div>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Equipos Participantes</h2>
            {loadingTeams ? (
              <p className="text-sm text-gray-500">Cargando equipos...</p>
            ) : formData.divisions.length === 0 ? (
              <p className="text-sm text-gray-500">Selecciona divisiones para habilitar la selección de equipos.</p>
            ) : (
              <div className="space-y-4">
                {filteredTeamsByDivision.map(({ division, teams }) => (
                  <div key={division._id} className="border border-gray-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-gray-800 mb-3">{division.name}</h3>
                    {teams.length === 0 ? (
                      <p className="text-sm text-gray-500">No hay equipos disponibles en esta división.</p>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {teams.map((team) => {
                          const checked = formData.participatingTeams.includes(team._id);

                          return (
                            <label
                              key={team._id}
                              className="flex items-center p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50"
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => handleTeamToggle(team._id)}
                                className="h-4 w-4 text-green-600 border-gray-300 rounded"
                              />
                              <div className="ml-3">
                                <p className="text-sm font-medium text-gray-900">{team.name}</p>
                                {team.shortName ? <p className="text-xs text-gray-500">{team.shortName}</p> : null}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href={`/tournaments/${tournamentId}`}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50"
            >
              {saving ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
