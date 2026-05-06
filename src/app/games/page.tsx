"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import LoadingSpinner from "@/components/LoadingSpinner";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import Pagination from "@/components/Pagination";
import Tag from "@/components/Tag";
import Avatar from "@/components/Avatar";
import { useAuth } from "@/hooks/useAuth";
import Link from "next/link";

type GameStatus = "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";

type TournamentOption = {
  _id: string;
  name: string;
  year: number;
};

type DivisionOption = {
  _id: string;
  name: string;
  category: string;
  tournament?: string | { _id: string; name: string };
};

type TeamOption = {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  colors: {
    primary: string;
    secondary?: string;
  };
};

type Game = {
  _id: string;
  scheduledDate: string;
  week?: number;
  round?: string;
  status: GameStatus;
  tournament: TournamentOption;
  division: DivisionOption;
  homeTeam: TeamOption | null;
  awayTeam: TeamOption | null;
  venue: {
    name: string;
    address: string;
  };
  notes?: string;
  score: {
    home: {
      q1?: number;
      q2?: number;
      q3?: number;
      q4?: number;
      overtime?: number;
      total: number;
    };
    away: {
      q1?: number;
      q2?: number;
      q3?: number;
      q4?: number;
      overtime?: number;
      total: number;
    };
  };
};

type ApiResponse<T> = {
  success: boolean;
  data: T;
  pagination?: {
    current: number;
    total: number;
    pages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
};

type GameFormState = {
  id?: string;
  tournament: string;
  division: string;
  homeTeam: string;
  awayTeam: string;
  scheduledDate: string;
  status: GameStatus;
  week: string;
  round: string;
  venueName: string;
  venueAddress: string;
  notes: string;
};

const INITIAL_FORM: GameFormState = {
  tournament: "",
  division: "",
  homeTeam: "",
  awayTeam: "",
  scheduledDate: "",
  status: "scheduled",
  week: "",
  round: "",
  venueName: "",
  venueAddress: "",
  notes: "",
};

function toDateTimeLocal(isoDate: string) {
  const date = new Date(isoDate);
  const offset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - offset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
}

function getRefId(value: unknown): string {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value) {
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : "";
  }
  return "";
}

function getTeamDisplayName(value: unknown): string {
  if (!value) return "TBD";
  if (typeof value === "string") return "TBD";
  if (typeof value === "object" && "name" in value) {
    return String((value as { name?: unknown }).name || "TBD");
  }
  return "TBD";
}

function getDivisionDisplayName(division: DivisionOption | string | null | undefined): string {
  if (!division || typeof division === "string") return "División";

  const categoryLabel: Record<string, string> = {
    masculino: "Masculino",
    femenino: "Femenino",
    mixto: "Mixto",
  };

  return division.category ? categoryLabel[division.category] || division.category : division.name || "División";
}

export default function GamesPage() {
  const { user } = useAuth();
  const canManageGames = user?.role === "admin";

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [walkOverLoadingGameId, setWalkOverLoadingGameId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    pages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters] = useState({
    status: "",
    tournament: "",
    division: "",
    upcoming: true,
  });

  const [form, setForm] = useState<GameFormState>(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [handledEditGameId, setHandledEditGameId] = useState<string | null>(null);

  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);

  const fetchGames = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(filters.status && { status: filters.status }),
          ...(filters.tournament && { tournament: filters.tournament }),
          ...(filters.division && { division: filters.division }),
          ...(filters.upcoming && { upcoming: "true" }),
        });

        const response = await fetch(`/api/games?${params}`);
        const data: ApiResponse<Game[]> = await response.json();

        if (!response.ok || !data.success) {
          setError(data.message || "Error al cargar partidos");
          return;
        }

        const orderedGames = [...data.data].sort(
          (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime(),
        );
        setGames(orderedGames);
        if (data.pagination) {
          setPagination(data.pagination);
          setCurrentPage(page);
        }
      } catch {
        setError("Error de conexión. Por favor, intenta de nuevo.");
      } finally {
        setLoading(false);
      }
    },
    [filters],
  );

  const fetchCatalogs = useCallback(async () => {
    try {
      const [tournamentsRes, divisionsRes] = await Promise.all([
        fetch("/api/tournaments?limit=100"),
        fetch("/api/divisions?limit=100"),
      ]);

      const tournamentsData: ApiResponse<TournamentOption[]> = await tournamentsRes.json();
      const divisionsData: ApiResponse<DivisionOption[]> = await divisionsRes.json();

      if (tournamentsData.success) {
        setTournaments(tournamentsData.data);
      }

      if (divisionsData.success) {
        setDivisions(divisionsData.data);
      }
    } catch {
      // No bloquear la vista por catálogos
    }
  }, []);

  const fetchTeamsForDivision = useCallback(async (divisionId: string) => {
    if (!divisionId) {
      setTeams([]);
      return;
    }

    try {
      const params = new URLSearchParams({ division: divisionId, limit: "100" });
      const response = await fetch(`/api/teams?${params}`);
      const data: ApiResponse<TeamOption[]> = await response.json();

      if (response.ok && data.success) {
        setTeams(data.data);
      } else {
        setTeams([]);
      }
    } catch {
      setTeams([]);
    }
  }, []);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  useEffect(() => {
    fetchGames(1);
  }, [fetchGames]);

  useEffect(() => {
    fetchTeamsForDivision(form.division);
  }, [form.division, fetchTeamsForDivision]);

  const filteredDivisionsForForm = useMemo(() => {
    if (!form.tournament) return divisions;

    const filtered = divisions.filter((division) => {
      const tournamentValue = division.tournament;
      if (!tournamentValue) return false;

      if (typeof tournamentValue === "string") {
        return tournamentValue === form.tournament;
      }

      return tournamentValue._id === form.tournament;
    });

    // Fallback: si no hay relación torneo-división consistente en datos,
    // mostrar todas para evitar que el selector quede vacío en edición.
    return filtered.length > 0 ? filtered : divisions;
  }, [divisions, form.tournament]);

  const filteredDivisionsForFilter = useMemo(() => {
    if (!filters.tournament) return divisions;

    return divisions.filter((division) => {
      const tournamentValue = division.tournament;
      if (!tournamentValue) return false;

      if (typeof tournamentValue === "string") {
        return tournamentValue === filters.tournament;
      }

      return tournamentValue._id === filters.tournament;
    });
  }, [divisions, filters.tournament]);

  const handlePageChange = (page: number) => {
    fetchGames(page);
  };

  const handleFilterChange = (key: string, value: string | boolean) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "tournament" ? { division: "" } : {}),
    }));
  };

  const handleFormChange = (key: keyof GameFormState, value: string) => {
    setForm((prev) => {
      if (key === "tournament") {
        return { ...prev, tournament: value, division: "", homeTeam: "", awayTeam: "" };
      }

      if (key === "division") {
        return { ...prev, division: value, homeTeam: "", awayTeam: "" };
      }

      return { ...prev, [key]: value };
    });
  };

  const openCreateForm = () => {
    if (!canManageGames) return;
    setForm(INITIAL_FORM);
    setEditingGame(null);
    setTeams([]);
    setFormError(null);
    setShowForm(true);
  };

  const openEditForm = useCallback(async (game: Game) => {
    if (!canManageGames) return;

    const tournamentId = getRefId(game.tournament);
    const divisionId = getRefId(game.division);
    const homeTeamId = getRefId(game.homeTeam);
    const awayTeamId = getRefId(game.awayTeam);

    if (divisionId) {
      await fetchTeamsForDivision(divisionId);
    } else {
      setTeams([]);
    }

    setForm({
      id: game._id,
      tournament: tournamentId,
      division: divisionId,
      homeTeam: homeTeamId,
      awayTeam: awayTeamId,
      scheduledDate: toDateTimeLocal(game.scheduledDate),
      status: game.status,
      week: game.week ? String(game.week) : "",
      round: game.round || "",
      venueName: game.venue?.name || "",
      venueAddress: game.venue?.address || "",
      notes: game.notes || "",
    });
    setEditingGame(game);
    setFormError(null);
    setShowForm(true);
  }, [canManageGames, fetchTeamsForDivision]);

  const closeForm = () => {
    setShowForm(false);
    setForm(INITIAL_FORM);
    setEditingGame(null);
    setFormError(null);
  };

  useEffect(() => {
    const editGameId = new URLSearchParams(window.location.search).get("edit");

    if (!canManageGames || !editGameId || handledEditGameId === editGameId) {
      return;
    }

    const openRequestedGame = async () => {
      const localGame = games.find((game) => game._id === editGameId);
      if (localGame) {
        setHandledEditGameId(editGameId);
        await openEditForm(localGame);
        return;
      }

      try {
        const response = await fetch(`/api/games/${editGameId}`);
        const data: ApiResponse<Game> = await response.json();

        if (response.ok && data.success && data.data) {
          setHandledEditGameId(editGameId);
          await openEditForm(data.data);
        }
      } catch {
        // No bloquear la página si el deep link de edición no carga.
      }
    };

    void openRequestedGame();
  }, [canManageGames, games, handledEditGameId, openEditForm]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    if (!form.tournament || !form.division) {
      setFormError("Selecciona torneo y división.");
      return;
    }

    if (!form.scheduledDate) {
      setFormError("La fecha y hora programada es requerida.");
      return;
    }

    if (!form.venueName.trim() || !form.venueAddress.trim()) {
      setFormError("El venue requiere nombre y dirección.");
      return;
    }

    if (form.homeTeam && form.awayTeam && form.homeTeam === form.awayTeam) {
      setFormError("El equipo local y visitante no pueden ser el mismo.");
      return;
    }

    const payload: Record<string, unknown> = {
      tournament: form.tournament,
      division: form.division,
      homeTeam: form.homeTeam || null,
      awayTeam: form.awayTeam || null,
      scheduledDate: new Date(form.scheduledDate).toISOString(),
      status: form.status,
      round: form.round.trim(),
      venue: {
        name: form.venueName.trim(),
        address: form.venueAddress.trim(),
      },
      ...(form.week ? { week: Number(form.week) } : {}),
      ...(form.notes.trim() ? { notes: form.notes.trim() } : {}),
      ...(form.id ? { id: form.id } : {}),
    };

    try {
      setSaving(true);

      const isEditing = Boolean(form.id);
      const response = await fetch("/api/games", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data: ApiResponse<Game> = await response.json();

      if (!response.ok || !data.success) {
        setFormError(data.message || "No se pudo guardar el partido");
        return;
      }

      closeForm();
      await fetchGames(currentPage);
    } catch {
      setFormError("Error de conexión. Intenta de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleWalkOver = async (game: Game, winner: "home" | "away") => {
    if (!canManageGames || game.status !== "scheduled") return;

    const winnerName = winner === "home" ? game.homeTeam?.name || "Local" : game.awayTeam?.name || "Visitante";
    const loserName = winner === "home" ? game.awayTeam?.name || "Visitante" : game.homeTeam?.name || "Local";

    const confirmed = window.confirm(
      `¿Confirmas Walk Over para ${winnerName}?\n\nResultado final: ${winner === "home" ? "14-0" : "0-14"}\nNo se asignarán puntos a jugadores.\n${loserName} perderá por WO.`,
    );

    if (!confirmed) return;

    try {
      setWalkOverLoadingGameId(game._id);
      setError(null);

      const response = await fetch(`/api/games/${game._id}/walkover`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ winner }),
      });

      const data: ApiResponse<Game> = await response.json();

      if (!response.ok || !data.success) {
        const message = data.message || "No se pudo registrar Walk Over";
        setError(message);
        if (showForm) {
          setFormError(message);
        }
        return;
      }

      if (showForm) {
        closeForm();
      }
      await fetchGames(currentPage);
    } catch {
      const message = "Error de conexión. Intenta de nuevo.";
      setError(message);
      if (showForm) {
        setFormError(message);
      }
    } finally {
      setWalkOverLoadingGameId(null);
    }
  };

  const getStatusTag = (status: GameStatus) => {
    const statusMap: Record<GameStatus, { label: string; type: "info" | "warning" | "success" | "error" }> = {
      scheduled: { label: "Programado", type: "info" },
      in_progress: { label: "En Curso", type: "success" },
      completed: { label: "Completado", type: "success" },
      postponed: { label: "Pospuesto", type: "warning" },
      cancelled: { label: "Cancelado", type: "error" },
    };

    const { label, type } = statusMap[status];
    return <Tag label={label} type={type} />;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("es-ES", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const formatTime = (date: string) => {
    return new Date(date).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDateTimeCompact = (date: string) => {
    const parsedDate = new Date(date);
    const dayMonth = parsedDate.toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "short",
    });

    const hour = parsedDate.toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dayMonth} · ${hour}`;
  };

  const getTeamAvatarFallback = (team: TeamOption | null) => {
    if (!team) return "TBD";
    return (team.shortName || team.name.substring(0, 2)).toUpperCase();
  };

  const renderTeamAvatar = (team: TeamOption | null, size: "sm" | "md") => (
    <Avatar
      imageUrl={team?.logo}
      alt={team?.name || "Equipo TBD"}
      fallback={getTeamAvatarFallback(team)}
      backgroundColor={team?.colors.primary || "#9CA3AF"}
      size={size}
      fallbackClassName={size === "sm" ? "text-xs" : "text-sm"}
    />
  );

  if (loading && games.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="md:flex md:items-center md:justify-end mb-8">
        <div className="mt-4 flex md:mt-0 md:ml-4">
          {canManageGames &&
            (!showForm ? (
              <button
                onClick={openCreateForm}
                className="ml-3 inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Programar Partido
              </button>
            ) : (
              <button
                onClick={closeForm}
                className="ml-3 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancelar
              </button>
            ))}
        </div>
      </div>

      {canManageGames && showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeForm}>
          <div
            className="w-full max-w-5xl max-h-[92vh] overflow-y-auto rounded-lg bg-white shadow-xl"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="game-form-title"
          >
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 id="game-form-title" className="text-lg font-semibold text-gray-900">
                  {form.id ? "Editar Partido" : "Nuevo Partido"}
                </h2>
                <button
                  type="button"
                  onClick={closeForm}
                  className="inline-flex items-center rounded-md border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>

              {editingGame && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
                  <p className="font-semibold">Información actual</p>
                  <p className="mt-1">
                    {getTeamDisplayName(editingGame.homeTeam)} vs {getTeamDisplayName(editingGame.awayTeam)} ·{" "}
                    {formatDate(editingGame.scheduledDate)} · {formatTime(editingGame.scheduledDate)}
                  </p>
                  <p className="mt-1">
                    {editingGame.venue.name}, {editingGame.venue.address}
                  </p>
                </div>
              )}

              {formError && <ErrorMessage message={formError} />}

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="tournament" className="block text-sm font-medium text-gray-700 mb-1">
                    Torneo
                  </label>
                  <select
                    id="tournament"
                    value={form.tournament}
                    onChange={(e) => handleFormChange("tournament", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar torneo</option>
                    {tournaments.map((tournament) => (
                      <option key={tournament._id} value={tournament._id}>
                        {tournament.name} ({tournament.year})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
                    División
                  </label>
                  <select
                    id="division"
                    value={form.division}
                    onChange={(e) => handleFormChange("division", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Seleccionar división</option>
                    {filteredDivisionsForForm.map((division) => (
                      <option key={division._id} value={division._id}>
                        {division.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha y hora
                  </label>
                  <input
                    id="scheduledDate"
                    type="datetime-local"
                    value={form.scheduledDate}
                    onChange={(e) => handleFormChange("scheduledDate", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="homeTeam" className="block text-sm font-medium text-gray-700 mb-1">
                    Equipo local
                  </label>
                  <select
                    id="homeTeam"
                    value={form.homeTeam}
                    onChange={(e) => handleFormChange("homeTeam", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">TBD</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="awayTeam" className="block text-sm font-medium text-gray-700 mb-1">
                    Equipo visitante
                  </label>
                  <select
                    id="awayTeam"
                    value={form.awayTeam}
                    onChange={(e) => handleFormChange("awayTeam", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">TBD</option>
                    {teams.map((team) => (
                      <option key={team._id} value={team._id}>
                        {team.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    id="status"
                    value={form.status}
                    onChange={(e) => handleFormChange("status", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="scheduled">Programado</option>
                    <option value="in_progress">En Curso</option>
                    <option value="completed">Completado</option>
                    <option value="postponed">Pospuesto</option>
                    <option value="cancelled">Cancelado</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="week" className="block text-sm font-medium text-gray-700 mb-1">
                    Semana
                  </label>
                  <input
                    id="week"
                    type="number"
                    min={1}
                    value={form.week}
                    onChange={(e) => handleFormChange("week", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label htmlFor="round" className="block text-sm font-medium text-gray-700 mb-1">
                    Ronda
                  </label>
                  <input
                    id="round"
                    type="text"
                    value={form.round}
                    onChange={(e) => handleFormChange("round", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej. Cuartos de final"
                  />
                </div>

                <div>
                  <label htmlFor="venueName" className="block text-sm font-medium text-gray-700 mb-1">
                    Venue (nombre)
                  </label>
                  <input
                    id="venueName"
                    type="text"
                    value={form.venueName}
                    onChange={(e) => handleFormChange("venueName", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="venueAddress" className="block text-sm font-medium text-gray-700 mb-1">
                    Venue (dirección)
                  </label>
                  <input
                    id="venueAddress"
                    type="text"
                    value={form.venueAddress}
                    onChange={(e) => handleFormChange("venueAddress", e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  id="notes"
                  value={form.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                />
              </div>

              {editingGame && editingGame.status === "scheduled" && (
                <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-semibold text-amber-900">Walk Over</p>
                  <p className="mt-1 text-sm text-amber-800">
                    Marca el partido como WO con resultado automático 14-0. No se asignarán puntos a jugadores.
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleWalkOver(editingGame, "home")}
                      disabled={walkOverLoadingGameId === editingGame._id}
                      className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      WO Local
                    </button>
                    <button
                      type="button"
                      onClick={() => handleWalkOver(editingGame, "away")}
                      disabled={walkOverLoadingGameId === editingGame._id}
                      className="w-full bg-amber-600 hover:bg-amber-700 disabled:bg-amber-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                    >
                      WO Visitante
                    </button>
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  {saving ? "Guardando..." : form.id ? "Actualizar Partido" : "Crear Partido"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <FilterAccordion className="mb-6 overflow-hidden rounded-lg bg-white shadow-sm" contentClassName="px-6 pb-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
              Estado
            </label>
            <select
              id="status-filter"
              value={filters.status}
              onChange={(e) => handleFilterChange("status", e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="">Todos los estados</option>
              <option value="scheduled">Programados</option>
              <option value="in_progress">En Curso</option>
              <option value="completed">Completados</option>
              <option value="postponed">Pospuestos</option>
              <option value="cancelled">Cancelados</option>
            </select>
          </div>

          <div>
            <label htmlFor="tournament-filter" className="block text-sm font-medium text-gray-700">
              Torneo
            </label>
            <select
              id="tournament-filter"
              value={filters.tournament}
              onChange={(e) => handleFilterChange("tournament", e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="">Todos</option>
              {tournaments.map((tournament) => (
                <option key={tournament._id} value={tournament._id}>
                  {tournament.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="division-filter" className="block text-sm font-medium text-gray-700">
              División
            </label>
            <select
              id="division-filter"
              value={filters.division}
              onChange={(e) => handleFilterChange("division", e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="">Todas</option>
              {filteredDivisionsForFilter.map((division) => (
                <option key={division._id} value={division._id}>
                  {division.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="upcoming-filter" className="block text-sm font-medium text-gray-700">
              Vista
            </label>
            <select
              id="upcoming-filter"
              value={filters.upcoming ? "upcoming" : "all"}
              onChange={(e) => handleFilterChange("upcoming", e.target.value === "upcoming")}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-green-500 focus:border-green-500 sm:text-sm rounded-md"
            >
              <option value="all">Todos los partidos</option>
              <option value="upcoming">Próximos partidos</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => setFilters({ status: "", tournament: "", division: "", upcoming: true })}
              className="w-full inline-flex justify-center items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Limpiar Filtros
            </button>
          </div>
        </div>
      </FilterAccordion>

      {error && (
        <div className="mb-6">
          <ErrorMessage message={error} onRetry={() => fetchGames(currentPage)} />
        </div>
      )}

      <div className="space-y-4">
        {games.map((game) => (
          <Link
            key={game._id}
            href={`/games/${game._id}`}
            className="block rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:p-6"
            aria-label={`Ver match ${game.homeTeam?.name || "TBD"} vs ${game.awayTeam?.name || "TBD"}`}
          >
            <div className="sm:hidden">
              <div className="flex items-start justify-between gap-3">
                <div className="text-sm text-gray-700 font-medium break-words">{game.venue.name}</div>
                <div className="text-xs text-gray-500 whitespace-nowrap">
                  {formatDateTimeCompact(game.scheduledDate)}
                </div>
              </div>

              <div className="mt-1 text-xs text-gray-500 break-words">{game.venue.address}</div>

              <div className="mt-3 flex justify-center">{getStatusTag(game.status)}</div>

              <div className="mt-3 flex items-center justify-between gap-2">
                <div className="w-[36%] flex flex-col items-center text-center">
                  {renderTeamAvatar(game.homeTeam, "sm")}
                  <div className="mt-2 text-xs font-semibold text-gray-900 leading-tight break-words w-full">
                    {game.homeTeam?.name || "TBD"}
                  </div>
                </div>

                <div className="w-[28%] text-center">
                  {game.status === "completed" || game.status === "in_progress" ? (
                    <div className="text-4xl font-bold text-blue-900 leading-none">
                      {game.score.home.total}:{game.score.away.total}
                    </div>
                  ) : (
                    <div>
                      <div className="text-base font-semibold text-gray-500">vs</div>
                      <div className="text-xs text-gray-400">{formatTime(game.scheduledDate)}</div>
                    </div>
                  )}
                </div>

                <div className="w-[36%] flex flex-col items-center text-center">
                  {renderTeamAvatar(game.awayTeam, "sm")}
                  <div className="mt-2 text-xs font-semibold text-gray-900 leading-tight break-words w-full">
                    {game.awayTeam?.name || "TBD"}
                  </div>
                </div>
              </div>

              <div className="mt-3 text-xs text-gray-500 text-center">
                {game.week ? `Semana ${game.week}` : "Sin semana"} · {getDivisionDisplayName(game.division)}
                {game.round ? ` · ${game.round}` : ""}
              </div>

            </div>

            <div className="hidden sm:block">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-2">
                      {getStatusTag(game.status)}
                      <span className="text-sm text-gray-500">
                        {game.week ? `Semana ${game.week}` : "Sin semana"} - {getDivisionDisplayName(game.division)}
                        {game.round ? ` - ${game.round}` : ""}
                      </span>
                    </div>
                    <div className="text-sm text-gray-500">{formatDate(game.scheduledDate)}</div>
                  </div>

                  <div className="flex items-center justify-center space-x-8 mb-4">
                    <div className="flex items-center space-x-3 flex-1 justify-end">
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">{game.homeTeam?.name || "TBD"}</div>
                        {game.homeTeam && !game.homeTeam.logo && game.homeTeam.shortName && (
                          <div className="text-sm text-gray-500">{game.homeTeam.shortName}</div>
                        )}
                      </div>
                      {renderTeamAvatar(game.homeTeam, "md")}
                    </div>

                    <div className="flex items-center space-x-4">
                      {game.status === "completed" || game.status === "in_progress" ? (
                        <div className="text-center">
                          <div className="text-2xl font-bold text-gray-900">
                            {game.score.home.total} - {game.score.away.total}
                          </div>
                        </div>
                      ) : (
                        <div className="text-center">
                          <div className="text-lg font-medium text-gray-500">vs</div>
                          <div className="text-sm text-gray-400">{formatTime(game.scheduledDate)}</div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center space-x-3 flex-1">
                      {renderTeamAvatar(game.awayTeam, "md")}
                      <div>
                        <div className="font-semibold text-gray-900">{game.awayTeam?.name || "TBD"}</div>
                        {game.awayTeam && !game.awayTeam.logo && game.awayTeam.shortName && (
                          <div className="text-sm text-gray-500">{game.awayTeam.shortName}</div>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center text-sm text-gray-500">
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                    </svg>
                    {game.venue.name}, {game.venue.address}
                  </div>
                </div>

              </div>
            </div>
          </Link>
        ))}
      </div>

      {games.length === 0 && !loading && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No hay partidos</h3>
          <p className="mt-1 text-sm text-gray-500">Comienza programando partidos para tus torneos.</p>
          {canManageGames && (
            <div className="mt-6">
              <button
                onClick={openCreateForm}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
              >
                Programar Partido
              </button>
            </div>
          )}
        </div>
      )}

      {games.length > 0 && (
        <Pagination
          currentPage={pagination.current}
          totalPages={pagination.pages}
          hasNext={pagination.hasNext}
          hasPrev={pagination.hasPrev}
          onPageChange={handlePageChange}
        />
      )}
    </div>
  );
}
