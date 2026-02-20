"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

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
    position: number;
    description: string;
    amount: number;
    trophy: string;
  }>;
}

export default function NewTournamentPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState<TournamentFormData>({
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
      overtimeRules: "Tiempo extra de 10 minutos, muerte súbita",
      scoringRules: {
        touchdown: 6,
        extraPoint1Yard: 1,
        extraPoint5Yard: 2,
        extraPoint10Yard: 3,
        safety: 2,
        fieldGoal: 3,
      },
    },
    prizes: [
      { position: 1, description: "Campeón", amount: 10000, trophy: "Copa de Oro" },
      { position: 2, description: "Subcampeón", amount: 5000, trophy: "Copa de Plata" },
      { position: 3, description: "Tercer Lugar", amount: 2500, trophy: "Copa de Bronce" },
    ],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Verificar si el usuario es admin
  if (!user || user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-50 border border-red-200 rounded-md p-6">
            <div className="flex justify-center mb-4">
              <svg className="w-12 h-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.664-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-red-800 mb-2">Acceso Restringido</h3>
            <p className="text-red-600 mb-4">Solo los administradores pueden crear torneos.</p>
            <div className="space-y-2">
              <Link
                href="/tournaments"
                className="block bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Ver Torneos
              </Link>
              <Link
                href="/auth/signin"
                className="block bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                Iniciar Sesión
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/tournaments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Error al crear el torneo");
      }

      const result = await response.json();

      // Redirigir al torneo creado
      router.push(`/tournaments/${result.data._id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setLoading(false);
    }
  };

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
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "number" ? Number(value) : value,
      }));
    }
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
        i === index ? { ...prize, [field]: field === "amount" || field === "position" ? Number(value) : value } : prize,
      ),
    }));
  };

  const addPrize = () => {
    setFormData((prev) => ({
      ...prev,
      prizes: [...prev.prizes, { position: prev.prizes.length + 1, description: "", amount: 0, trophy: "" }],
    }));
  };

  const removePrize = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      prizes: prev.prizes.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Torneo</h1>
              <p className="mt-1 text-sm text-gray-600">Configura un nuevo torneo de Flag Football</p>
            </div>
            <Link
              href="/tournaments"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              ← Volver a Torneos
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit} className="space-y-8">
          {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md">{error}</div>}

          {/* Información Básica */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Información Básica</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Torneo *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Ej: APERTURA FLAG 2025"
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
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="Apertura">Apertura</option>
                  <option value="Clausura">Clausura</option>
                  <option value="Verano">Verano</option>
                  <option value="Invierno">Invierno</option>
                </select>
              </div>

              <div>
                <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-2">
                  Año *
                </label>
                <input
                  type="number"
                  id="year"
                  name="year"
                  required
                  min="2024"
                  max="2030"
                  value={formData.year}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="format" className="block text-sm font-medium text-gray-700 mb-2">
                  Formato *
                </label>
                <select
                  id="format"
                  name="format"
                  required
                  value={formData.format}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                  required
                  value={formData.status}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
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
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Descripción detallada del torneo..."
              />
            </div>
          </div>

          {/* Fechas */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Fechas Importantes</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label htmlFor="registrationDeadline" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha Límite de Registro *
                </label>
                <input
                  type="date"
                  id="registrationDeadline"
                  name="registrationDeadline"
                  required
                  value={formData.registrationDeadline}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Inicio *
                </label>
                <input
                  type="date"
                  id="startDate"
                  name="startDate"
                  required
                  value={formData.startDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Finalización *
                </label>
                <input
                  type="date"
                  id="endDate"
                  name="endDate"
                  required
                  value={formData.endDate}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {/* Reglas del Juego */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Reglas del Juego</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label htmlFor="gameDuration" className="block text-sm font-medium text-gray-700 mb-2">
                  Duración del Juego (minutos)
                </label>
                <input
                  type="number"
                  id="gameDuration"
                  name="rules.gameDuration"
                  min="1"
                  value={formData.rules.gameDuration}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="quarters" className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Cuartos
                </label>
                <input
                  type="number"
                  id="quarters"
                  name="rules.quarters"
                  min="1"
                  max="4"
                  value={formData.rules.quarters}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="timeoutsPerTeam" className="block text-sm font-medium text-gray-700 mb-2">
                  Tiempos Fuera por Equipo
                </label>
                <input
                  type="number"
                  id="timeoutsPerTeam"
                  name="rules.timeoutsPerTeam"
                  min="0"
                  max="10"
                  value={formData.rules.timeoutsPerTeam}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="playersPerTeam" className="block text-sm font-medium text-gray-700 mb-2">
                  Jugadores por Equipo
                </label>
                <input
                  type="number"
                  id="playersPerTeam"
                  name="rules.playersPerTeam"
                  min="5"
                  value={formData.rules.playersPerTeam}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>

              <div>
                <label htmlFor="minimumPlayers" className="block text-sm font-medium text-gray-700 mb-2">
                  Mínimo de Jugadores
                </label>
                <input
                  type="number"
                  id="minimumPlayers"
                  name="rules.minimumPlayers"
                  min="3"
                  max="10"
                  value={formData.rules.minimumPlayers}
                  onChange={handleInputChange}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-6">
              <label htmlFor="overtimeRules" className="block text-sm font-medium text-gray-700 mb-2">
                Reglas de Tiempo Extra
              </label>
              <textarea
                id="overtimeRules"
                name="rules.overtimeRules"
                rows={3}
                value={formData.rules.overtimeRules}
                onChange={handleInputChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Describe las reglas para tiempo extra..."
              />
            </div>

            {/* Sistema de Puntuación */}
            <div className="mt-8">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Sistema de Puntuación</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Touchdown</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rules.scoringRules.touchdown}
                    onChange={(e) => handleScoringRuleChange("touchdown", Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extra Point (1 yarda)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rules.scoringRules.extraPoint1Yard}
                    onChange={(e) => handleScoringRuleChange("extraPoint1Yard", Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extra Point (5 yardas)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rules.scoringRules.extraPoint5Yard}
                    onChange={(e) => handleScoringRuleChange("extraPoint5Yard", Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Extra Point (10 yardas)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rules.scoringRules.extraPoint10Yard}
                    onChange={(e) => handleScoringRuleChange("extraPoint10Yard", Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Safety</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rules.scoringRules.safety}
                    onChange={(e) => handleScoringRuleChange("safety", Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Field Goal</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.rules.scoringRules.fieldGoal}
                    onChange={(e) => handleScoringRuleChange("fieldGoal", Number(e.target.value))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Premios */}
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

            <div className="space-y-4">
              {formData.prizes.map((prize, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border border-gray-200 rounded-lg"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Posición</label>
                    <input
                      type="number"
                      min="1"
                      value={prize.position}
                      onChange={(e) => handlePrizeChange(index, "position", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                    <input
                      type="text"
                      value={prize.description}
                      onChange={(e) => handlePrizeChange(index, "description", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      placeholder="Ej: Campeón"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Premio ($)</label>
                    <input
                      type="number"
                      min="0"
                      value={prize.amount}
                      onChange={(e) => handlePrizeChange(index, "amount", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Trofeo</label>
                    <div className="flex space-x-2">
                      <input
                        type="text"
                        value={prize.trophy}
                        onChange={(e) => handlePrizeChange(index, "trophy", e.target.value)}
                        className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        placeholder="Ej: Copa de Oro"
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
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end space-x-4 pt-6 border-t border-gray-200">
            <Link
              href="/tournaments"
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-6 py-2 rounded-md font-medium transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Creando...
                </div>
              ) : (
                "Crear Torneo"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
