"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ErrorMessage from "@/components/ErrorMessage";
import FilterAccordion from "@/components/FilterAccordion";
import InlineFeedback from "@/components/InlineFeedback";
import PageHero from "@/components/PageHero";
import Pagination from "@/components/Pagination";
import Avatar from "@/components/Avatar";
import RevealOnScroll from "@/components/RevealOnScroll";
import Skeleton from "@/components/Skeleton";
import GameDayImageDownload from "@/components/GameDayImageDownload";
import { useAuth } from "@/hooks/useAuth";
import { useCachedState } from "@/hooks/useCachedState";
import Link from "next/link";

const gamesHero = {
  path: "/games",
  eyebrow: "Calendario competitivo",
  title: "Partidos",
  imageSrc: "/Games.JPG",
};

type GameStatus = "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";
type GamePhase = "regular" | "playoff" | "final";

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

type JudgeOption = {
  _id: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

type Game = {
  _id: string;
  scheduledDate: string;
  week?: number;
  round?: string;
  status: GameStatus;
  phase?: GamePhase;
  tournament: TournamentOption;
  division: DivisionOption;
  homeTeam: TeamOption | null;
  awayTeam: TeamOption | null;
  venue: {
    name: string;
    address: string;
  };
  notes?: string;
  officials: Array<{
    judgeId?: string;
    name: string;
    role: "referee" | "down_judge" | "side_judge" | "table_judge";
  }>;
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
  phase: GamePhase;
  week: string;
  round: string;
  venueName: string;
  venueAddress: string;
  refereeJudgeId: string;
  downJudgeId: string;
  sideJudgeId: string;
  tableJudgeId: string;
  notes: string;
};

type GameFilters = {
  status: string;
  phase: string;
  tournament: string;
  division: string;
  upcoming: boolean;
};

const INITIAL_FORM: GameFormState = {
  tournament: "",
  division: "",
  homeTeam: "",
  awayTeam: "",
  scheduledDate: "",
  status: "scheduled",
  phase: "regular",
  week: "",
  round: "",
  venueName: "",
  venueAddress: "",
  refereeJudgeId: "",
  downJudgeId: "",
  sideJudgeId: "",
  tableJudgeId: "",
  notes: "",
};

const INITIAL_FILTERS: GameFilters = {
  status: "",
  phase: "",
  tournament: "",
  division: "",
  upcoming: true,
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

function GameCardSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-lg bg-white p-4 shadow-md sm:p-6" aria-label="Cargando partido">
      <div className="hidden sm:block">
        <Skeleton className="absolute left-1/2 top-0 h-7 w-28 -translate-x-1/2 rounded-b-md" />
      </div>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton className="h-4 w-36 rounded" />
          <Skeleton className="h-3 w-52 max-w-full rounded" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="ml-auto h-3 w-14 rounded" />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center justify-end gap-3">
          <div className="hidden space-y-2 text-right sm:block">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="ml-auto h-3 w-16 rounded" />
          </div>
          <Skeleton className="h-12 w-12 rounded-full" />
        </div>

        <div className="flex min-w-24 flex-col items-center gap-2">
          <Skeleton className="h-5 w-8 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
        </div>

        <div className="flex flex-1 items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-full" />
          <div className="hidden space-y-2 sm:block">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-3 w-16 rounded" />
          </div>
        </div>
      </div>

      <Skeleton className="mx-auto mt-5 h-3 w-48 max-w-full rounded" />
    </div>
  );
}

function GamesSkeletonList() {
  return (
    <div className="space-y-4" aria-label="Cargando partidos">
      {Array.from({ length: 4 }).map((_, index) => (
        <GameCardSkeleton key={index} />
      ))}
    </div>
  );
}

export default function GamesPage() {
  const { user } = useAuth();
  const canManageGames = user?.role === "admin";

  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [catalogWarning, setCatalogWarning] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [walkOverLoadingGameId, setWalkOverLoadingGameId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    current: 1,
    total: 0,
    pages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [filters, setFilters, resetCachedFilters, filtersHydrated] = useCachedState<GameFilters>(
    "filters:games",
    INITIAL_FILTERS,
  );

  const [form, setForm] = useState<GameFormState>(INITIAL_FORM);
  const [showForm, setShowForm] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);
  const [handledEditGameId, setHandledEditGameId] = useState<string | null>(null);

  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [divisions, setDivisions] = useState<DivisionOption[]>([]);
  const [teams, setTeams] = useState<TeamOption[]>([]);
  const [judges, setJudges] = useState<JudgeOption[]>([]);

  const fetchGames = useCallback(
    async (page = 1) => {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: page.toString(),
          limit: "10",
          ...(filters.status && { status: filters.status }),
          ...(filters.phase && { phase: filters.phase }),
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
      setCatalogWarning("No se pudieron cargar los filtros. Algunos selectores podrían estar vacíos.");
    }
  }, []);

  const fetchJudges = useCallback(async () => {
    if (!canManageGames) {
      setJudges([]);
      return;
    }

    try {
      const response = await fetch("/api/judges");
      const data: ApiResponse<JudgeOption[]> = await response.json();

      if (response.ok && data.success && Array.isArray(data.data)) {
        setJudges(data.data);
      }
    } catch {
      setJudges([]);
    }
  }, [canManageGames]);

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
    fetchJudges();
  }, [fetchJudges]);

  useEffect(() => {
    if (!filtersHydrated) return;

    fetchGames(1);
  }, [fetchGames, filtersHydrated]);

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
    setFieldErrors((prev) => ({ ...prev, [key]: validateGameField(key, value) }));
    setFormError(null);
  };

  const validateGameField = (key: keyof GameFormState, value: string) => {
    if (["tournament", "division", "scheduledDate", "venueName", "venueAddress"].includes(key) && !value.trim()) {
      return "Este campo es obligatorio.";
    }

if (key === "homeTeam" || key === "awayTeam") {
  const nextHomeTeam = key === "homeTeam" ? value : form.homeTeam;
  const nextAwayTeam = key === "awayTeam" ? value : form.awayTeam;
  if (nextHomeTeam && nextAwayTeam && nextHomeTeam === nextAwayTeam) {
    return "El equipo local y visitante no pueden ser el mismo.";
  }
}

    return "";
  };

  const validateGameForm = () => {
    const nextErrors: Record<string, string> = {};
    (["tournament", "division", "scheduledDate", "venueName", "venueAddress"] as Array<keyof GameFormState>).forEach(
      (key) => {
        const message = validateGameField(key, form[key] ?? "");
        if (message) nextErrors[key] = message;
      },
    );

    if (form.homeTeam && form.awayTeam && form.homeTeam === form.awayTeam) {
      nextErrors.awayTeam = "El equipo local y visitante no pueden ser el mismo.";
    }

    return nextErrors;
  };

  const requiredLabel = (label: string) => (
    <>
      {label} <span className="text-red-600">*</span>
      <span className="ml-1 text-xs font-normal text-gray-500">Obligatorio</span>
    </>
  );

  const formInputClassName = (fieldName: keyof GameFormState) =>
    `w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
      fieldErrors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-300"
    }`;

  const renderFieldError = (fieldName: keyof GameFormState) =>
    fieldErrors[fieldName] ? (
      <span id={`game-${fieldName}-error`} className="mt-1 block text-xs font-medium text-red-600">
        {fieldErrors[fieldName]}
      </span>
    ) : null;

  const isGameFormReady = Object.keys(validateGameForm()).length === 0;

  const openCreateForm = () => {
    if (!canManageGames) return;
    setForm(INITIAL_FORM);
    setEditingGame(null);
    setTeams([]);
    setFormError(null);
    setFieldErrors({});
    setShowForm(true);
  };

  const openEditForm = useCallback(
    async (game: Game) => {
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
        phase: game.phase || "regular",
        week: game.week ? String(game.week) : "",
        round: game.round || "",
        venueName: game.venue?.name || "",
        venueAddress: game.venue?.address || "",
        refereeJudgeId: game.officials.find((official) => official.role === "referee")?.judgeId || "",
        downJudgeId: game.officials.find((official) => official.role === "down_judge")?.judgeId || "",
        sideJudgeId: game.officials.find((official) => official.role === "side_judge")?.judgeId || "",
        tableJudgeId: game.officials.find((official) => official.role === "table_judge")?.judgeId || "",
        notes: game.notes || "",
      });
      setEditingGame(game);
      setFormError(null);
      setFieldErrors({});
      setShowForm(true);
    },
    [canManageGames, fetchTeamsForDivision],
  );

  const closeForm = () => {
    setShowForm(false);
    setForm(INITIAL_FORM);
    setEditingGame(null);
    setFormError(null);
    setFieldErrors({});
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
      } catch (error) {
        console.warn("No se pudo cargar el partido para edición:", error);
      }
    };

    void openRequestedGame();
  }, [canManageGames, games, handledEditGameId, openEditForm]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    const nextFieldErrors = validateGameForm();
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      return;
    }

    const selectedJudgeIds = [form.refereeJudgeId, form.downJudgeId, form.sideJudgeId, form.tableJudgeId].filter(Boolean);

    if (new Set(selectedJudgeIds).size !== selectedJudgeIds.length) {
      setFormError("Un juez no se puede repetir en un partido.");
      return;
    }

    const officials = [
      { role: "referee", judgeId: form.refereeJudgeId },
      { role: "down_judge", judgeId: form.downJudgeId },
      { role: "side_judge", judgeId: form.sideJudgeId },
      { role: "table_judge", judgeId: form.tableJudgeId },
    ].filter((official) => official.judgeId);

    const payload: Record<string, unknown> = {
      tournament: form.tournament,
      division: form.division,
      homeTeam: form.homeTeam || null,
      awayTeam: form.awayTeam || null,
      scheduledDate: new Date(form.scheduledDate).toISOString(),
      status: form.status,
      phase: form.phase,
      round: form.round.trim(),
      officials,
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

  const isJudgeSelectedInAnotherRole = (
    judgeId: string,
    currentField: "refereeJudgeId" | "downJudgeId" | "sideJudgeId" | "tableJudgeId",
  ) => {
    const selectedByField = {
      refereeJudgeId: form.refereeJudgeId,
      downJudgeId: form.downJudgeId,
      sideJudgeId: form.sideJudgeId,
      tableJudgeId: form.tableJudgeId,
    };

    return Object.entries(selectedByField).some(([field, selectedJudgeId]) => {
      if (field === currentField) return false;
      return selectedJudgeId === judgeId;
    });
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

  const getStatusBadge = (status: GameStatus, placement: "right" | "top" = "top") => {
    const statusMap: Record<GameStatus, { label: string; className: string }> = {
      scheduled: { label: "Programado", className: "bg-blue-500/75 text-white" },
      in_progress: { label: "En Curso", className: "bg-red-600/75 text-white" },
      completed: { label: "Finalizado", className: "bg-pink-600/75 text-white" },
      postponed: { label: "Pospuesto", className: "bg-yellow-500/75 text-white" },
      cancelled: { label: "Cancelado", className: "bg-red-700/75 text-white" },
    };

    const { label, className } = statusMap[status];
    const placementClassName =
      placement === "right"
        ? "min-w-32 rounded-l-md px-2 py-1 shadow-md"
        : "min-w-28 rounded-b-md px-3 py-1.5 shadow-sm";

    return (
      <div
        className={`inline-flex justify-center text-center text-xs font-bold uppercase tracking-wide ${placementClassName} ${className}`}
      >
        {label}
      </div>
    );
  };

  const getPhaseBadge = (phase: GamePhase | undefined) => {
    const phaseMap: Record<GamePhase, { label: string; className: string }> = {
      regular: { label: "Temporada regular", className: "border-emerald-200 bg-emerald-50 text-emerald-800" },
      playoff: { label: "Playoffs", className: "border-indigo-200 bg-indigo-50 text-indigo-800" },
      final: { label: "Final", className: "border-amber-200 bg-amber-50 text-amber-800" },
    };
    const { label, className } = phaseMap[phase || "regular"];

    return (
      <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${className}`}>
        {label}
      </span>
    );
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

  return (
    <>
      <PageHero {...gamesHero}>
        <FilterAccordion
          className="overflow-hidden rounded-lg border border-white/25 bg-white/92 text-slate-900 shadow-[0_18px_44px_rgba(8,27,43,0.28)] backdrop-blur-md"
          buttonClassName="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-semibold text-slate-900 sm:px-5"
          contentClassName="px-4 pb-4 sm:px-5 sm:pb-5"
        >
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-6">
            <div>
              <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700">
                Estado
              </label>
              <select
                id="status-filter"
                value={filters.status}
                onChange={(e) => handleFilterChange("status", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
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
              <label htmlFor="phase-filter" className="block text-sm font-medium text-gray-700">
                Fase
              </label>
              <select
                id="phase-filter"
                value={filters.phase}
                onChange={(e) => handleFilterChange("phase", e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="">Todas las fases</option>
                <option value="regular">Temporada regular</option>
                <option value="playoff">Playoffs</option>
                <option value="final">Final</option>
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
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
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
                className="mt-1 block w-full rounded-md border-gray-300 py-2 pl-3 pr-10 text-base focus:border-green-500 focus:outline-none focus:ring-green-500 sm:text-sm"
              >
                <option value="all">Todos los partidos</option>
                <option value="upcoming">Próximos partidos</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  resetCachedFilters();
                  setCurrentPage(1);
                }}
                className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Limpiar Filtros
              </button>
            </div>
            {canManageGames && (
              <div className="flex items-end">
                {!showForm ? (
                  <button
                    onClick={openCreateForm}
                    className="inline-flex w-full items-center justify-center rounded-md border border-transparent bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Programar Partido
                  </button>
                ) : (
                  <button
                    onClick={closeForm}
                    className="inline-flex w-full items-center justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            )}
            {canManageGames && (
              <div className="flex items-end">
                <GameDayImageDownload games={games} />
              </div>
            )}
          </div>
        </FilterAccordion>
      </PageHero>

      <div className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8">
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
                      {requiredLabel("Torneo")}
                    </label>
                    <select
                      id="tournament"
                      value={form.tournament}
                      onChange={(e) => handleFormChange("tournament", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.tournament)}
                      aria-describedby={fieldErrors.tournament ? "game-tournament-error" : undefined}
                      className={formInputClassName("tournament")}
                      required
                    >
                      <option value="">Seleccionar torneo</option>
                      {tournaments.map((tournament) => (
                        <option key={tournament._id} value={tournament._id}>
                          {tournament.name} ({tournament.year})
                        </option>
                      ))}
                    </select>
                    {renderFieldError("tournament")}
                  </div>

                  <div>
                    <label htmlFor="division" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("División")}
                    </label>
                    <select
                      id="division"
                      value={form.division}
                      onChange={(e) => handleFormChange("division", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.division)}
                      aria-describedby={fieldErrors.division ? "game-division-error" : undefined}
                      className={formInputClassName("division")}
                      required
                    >
                      <option value="">Seleccionar división</option>
                      {filteredDivisionsForForm.map((division) => (
                        <option key={division._id} value={division._id}>
                          {division.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("division")}
                  </div>

                  <div>
                    <label htmlFor="scheduledDate" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Fecha y hora")}
                    </label>
                    <input
                      id="scheduledDate"
                      type="datetime-local"
                      value={form.scheduledDate}
                      onChange={(e) => handleFormChange("scheduledDate", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.scheduledDate)}
                      aria-describedby={fieldErrors.scheduledDate ? "game-scheduledDate-error" : undefined}
                      className={formInputClassName("scheduledDate")}
                      required
                    />
                    {renderFieldError("scheduledDate")}
                  </div>

                  <div>
                    <label htmlFor="homeTeam" className="block text-sm font-medium text-gray-700 mb-1">
                      Equipo local
                    </label>
                    <select
                      id="homeTeam"
                      value={form.homeTeam}
                      onChange={(e) => handleFormChange("homeTeam", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.homeTeam)}
                      aria-describedby={fieldErrors.homeTeam ? "game-homeTeam-error" : undefined}
                      className={formInputClassName("homeTeam")}
                    >
                      <option value="">TBD</option>
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("homeTeam")}
                  </div>

                  <div>
                    <label htmlFor="awayTeam" className="block text-sm font-medium text-gray-700 mb-1">
                      Equipo visitante
                    </label>
                    <select
                      id="awayTeam"
                      value={form.awayTeam}
                      onChange={(e) => handleFormChange("awayTeam", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.awayTeam)}
                      aria-describedby={fieldErrors.awayTeam ? "game-awayTeam-error" : undefined}
                      className={formInputClassName("awayTeam")}
                    >
                      <option value="">TBD</option>
                      {teams.map((team) => (
                        <option key={team._id} value={team._id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                    {renderFieldError("awayTeam")}
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
                    <label htmlFor="phase" className="block text-sm font-medium text-gray-700 mb-1">
                      Fase
                    </label>
                    <select
                      id="phase"
                      value={form.phase}
                      onChange={(e) => handleFormChange("phase", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="regular">Temporada regular</option>
                      <option value="playoff">Playoffs</option>
                      <option value="final">Final</option>
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
                      {requiredLabel("Venue (nombre)")}
                    </label>
                    <input
                      id="venueName"
                      type="text"
                      value={form.venueName}
                      onChange={(e) => handleFormChange("venueName", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.venueName)}
                      aria-describedby={fieldErrors.venueName ? "game-venueName-error" : undefined}
                      className={formInputClassName("venueName")}
                      required
                    />
                    {renderFieldError("venueName")}
                  </div>

                  <div>
                    <label htmlFor="refereeJudgeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Referee
                    </label>
                    <select
                      id="refereeJudgeId"
                      value={form.refereeJudgeId}
                      onChange={(e) => handleFormChange("refereeJudgeId", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar juez</option>
                      {judges.map((judge) => (
                        <option
                          key={judge._id}
                          value={judge._id}
                          disabled={isJudgeSelectedInAnotherRole(judge._id, "refereeJudgeId")}
                        >
                          {judge.fullName || `${judge.firstName} ${judge.lastName}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="downJudgeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Down judge
                    </label>
                    <select
                      id="downJudgeId"
                      value={form.downJudgeId}
                      onChange={(e) => handleFormChange("downJudgeId", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar juez</option>
                      {judges.map((judge) => (
                        <option
                          key={judge._id}
                          value={judge._id}
                          disabled={isJudgeSelectedInAnotherRole(judge._id, "downJudgeId")}
                        >
                          {judge.fullName || `${judge.firstName} ${judge.lastName}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="sideJudgeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Side judge
                    </label>
                    <select
                      id="sideJudgeId"
                      value={form.sideJudgeId}
                      onChange={(e) => handleFormChange("sideJudgeId", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar juez</option>
                      {judges.map((judge) => (
                        <option
                          key={judge._id}
                          value={judge._id}
                          disabled={isJudgeSelectedInAnotherRole(judge._id, "sideJudgeId")}
                        >
                          {judge.fullName || `${judge.firstName} ${judge.lastName}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tableJudgeId" className="block text-sm font-medium text-gray-700 mb-1">
                      Juez de mesa
                    </label>
                    <select
                      id="tableJudgeId"
                      value={form.tableJudgeId}
                      onChange={(e) => handleFormChange("tableJudgeId", e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Seleccionar juez</option>
                      {judges.map((judge) => (
                        <option
                          key={judge._id}
                          value={judge._id}
                          disabled={isJudgeSelectedInAnotherRole(judge._id, "tableJudgeId")}
                        >
                          {judge.fullName || `${judge.firstName} ${judge.lastName}`.trim()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label htmlFor="venueAddress" className="block text-sm font-medium text-gray-700 mb-1">
                      {requiredLabel("Venue (dirección)")}
                    </label>
                    <input
                      id="venueAddress"
                      type="text"
                      value={form.venueAddress}
                      onChange={(e) => handleFormChange("venueAddress", e.target.value)}
                      aria-invalid={Boolean(fieldErrors.venueAddress)}
                      aria-describedby={fieldErrors.venueAddress ? "game-venueAddress-error" : undefined}
                      className={formInputClassName("venueAddress")}
                      required
                    />
                    {renderFieldError("venueAddress")}
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
                    disabled={saving || !isGameFormReady}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    {saving ? "Guardando..." : form.id ? "Actualizar Partido" : "Crear Partido"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {catalogWarning && (
          <div className="mb-4">
            <InlineFeedback variant="warning" message={catalogWarning} compact />
          </div>
        )}

        {error && (
          <div className="mb-6">
            <ErrorMessage message={error} onRetry={() => fetchGames(currentPage)} />
          </div>
        )}

        {loading && games.length === 0 ? (
          <GamesSkeletonList />
        ) : (
          <div className="space-y-4">
            {games.map((game, index) => (
              <RevealOnScroll key={game._id} delayMs={(index % 4) * 60}>
                <Link
                  href={`/games/${game._id}`}
                  className="relative block overflow-hidden rounded-lg bg-white p-4 shadow-md transition-shadow hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:p-6"
                  aria-label={`Ver match ${game.homeTeam?.name || "TBD"} vs ${game.awayTeam?.name || "TBD"}`}
                >
                <div className="absolute left-1/2 top-0 z-10 hidden -translate-x-1/2 sm:block">
                  {getStatusBadge(game.status, "top")}
                </div>
                <div className="sm:hidden">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm text-gray-700 font-medium break-words">{game.venue.name}</div>
                      <div className="mt-1 text-xs text-gray-500 break-words">{game.venue.address}</div>
                    </div>
                    <div className="-mr-4 flex shrink-0 flex-col items-end gap-1">
                      <div className="pr-4 text-xs text-gray-500 whitespace-nowrap">
                        {formatDateTimeCompact(game.scheduledDate)}
                      </div>
                      {getStatusBadge(game.status, "right")}
                    </div>
                  </div>

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
                  <div className="mt-3 flex justify-center">{getPhaseBadge(game.phase)}</div>
                </div>

                <div className="hidden sm:block">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex-1">
                      <div className="mb-4 flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-gray-700">{game.venue.name}</div>
                          <div className="mt-1 text-sm text-gray-500">{game.venue.address}</div>
                        </div>
                        <div className="-mr-6 flex shrink-0 flex-col items-end gap-1">
                          <div className="pr-6 text-right text-sm text-gray-500">
                            <div>{formatDate(game.scheduledDate)}</div>
                            <div>{formatTime(game.scheduledDate)}</div>
                          </div>
                        </div>
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

                        <div className="flex min-w-24 flex-col items-center">
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

                      <div className="text-center text-sm text-gray-500">
                        {game.week ? `Semana ${game.week}` : "Sin semana"} · {getDivisionDisplayName(game.division)}
                        {game.round ? ` · ${game.round}` : ""}
                      </div>
                      <div className="mt-3 flex justify-center">{getPhaseBadge(game.phase)}</div>
                    </div>
                  </div>
                </div>
                </Link>
              </RevealOnScroll>
            ))}
          </div>
        )}

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
    </>
  );
}
