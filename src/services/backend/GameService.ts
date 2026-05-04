import { Game, GameEvent, GameEventType, GameStatus } from "../../entities/Game";
import { GameScore, QuarterScore } from "../../entities/valueObjects/Score";
import { Venue } from "../../entities/valueObjects/Venue";
import RepositoryContainer from "../../repositories";
import { StandingService } from "./StandingService";

interface ScoreUpdate {
  home: { q1: number; q2: number; q3: number; q4: number; overtime?: number };
  away: { q1: number; q2: number; q3: number; q4: number; overtime?: number };
}

interface CreateGameEventInput {
  quarter: number;
  type: GameEventType;
  team: string;
  player?: string;
  points?: number;
}

interface StoredGameEvent {
  _id?: string;
  quarter: number;
  type: GameEventType;
  team: string | { _id?: string };
  player: string | { _id?: string };
  points?: number;
}

/**
 * Servicio de gestión de partidos
 */
export class GameService {
  private gameRepo = RepositoryContainer.getGameRepository();
  private teamRepo = RepositoryContainer.getTeamRepository();
  private standingService = new StandingService();

  /**
   * Crea un nuevo partido
   */
  async createGame(data: {
    tournament: string;
    division: string;
    homeTeam: string | null;
    awayTeam: string | null;
    venue: { name: string; address: string };
    scheduledDate: Date;
    week?: number;
    round?: string;
    status?: GameStatus;
  }): Promise<Game> {
    // Validar que los equipos existan
    if (data.homeTeam) {
      const homeTeam = await this.teamRepo.findById(data.homeTeam);
      if (!homeTeam) {
        throw new Error("Equipo local no encontrado");
      }
    }

    if (data.awayTeam) {
      const awayTeam = await this.teamRepo.findById(data.awayTeam);
      if (!awayTeam) {
        throw new Error("Equipo visitante no encontrado");
      }
    }

    // Crear venue
    const venue = new Venue(data.venue.name, data.venue.address);
    const venueValidation = venue.validate();
    if (!venueValidation.isValid) {
      throw new Error(venueValidation.errors.join(", "));
    }

    // Crear game
    const game = new Game(
      data.tournament,
      data.division,
      venue,
      data.scheduledDate,
      data.status || "scheduled",
      data.homeTeam,
      data.awayTeam,
      GameScore.zero(),
      undefined,
      data.week,
      data.round,
    );

    // Validar
    const validation = game.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    // Persistir
    return await this.gameRepo.create(game);
  }

  /**
   * Actualiza el score de un partido
   */
  async updateGameScore(id: string, scoreData: ScoreUpdate): Promise<Game> {
    const game = await this.gameRepo.findById(id);
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    // Calcular nuevo score. Los repositorios Mongo devuelven documentos poblados,
    // así que no dependemos de métodos de entidad en este punto.
    const newScore = new GameScore(
      new QuarterScore(
        scoreData.home.q1,
        scoreData.home.q2,
        scoreData.home.q3,
        scoreData.home.q4,
        scoreData.home.overtime || 0,
      ),
      new QuarterScore(
        scoreData.away.q1,
        scoreData.away.q2,
        scoreData.away.q3,
        scoreData.away.q4,
        scoreData.away.overtime || 0,
      ),
    );

    // Validar score
    const scoreValidation = newScore.validate();
    if (!scoreValidation.isValid) {
      throw new Error(scoreValidation.errors.join(", "));
    }

    // Actualizar score
    const updatedGame = await this.gameRepo.updateScore(id, newScore);

    // Mantener standings vivos para partidos en curso y finales.
    if (updatedGame.status === "in_progress" || updatedGame.status === "completed") {
      await this.recalculateStandingsForGame(updatedGame);
    }

    return updatedGame;
  }

  /**
   * Registra un evento de Live Match y actualiza el marcador si corresponde.
   */
  async addGameEvent(id: string, eventData: CreateGameEventInput): Promise<Game> {
    const game = await this.gameRepo.findById(id);
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    if (game.status !== "in_progress") {
      throw new Error("Solo se pueden agregar eventos a partidos en progreso");
    }

    if (!Number.isInteger(eventData.quarter) || eventData.quarter < 1 || eventData.quarter > 5) {
      throw new Error("El cuarto debe estar entre 1 y 5");
    }

    if (!eventData.type) {
      throw new Error("El tipo de evento es requerido");
    }

    if (!eventData.team) {
      throw new Error("El equipo es requerido");
    }

    const requiresPlayer = eventData.type !== "quarter_end" && eventData.type !== "game_end";
    if (requiresPlayer && !eventData.player) {
      throw new Error("El jugador es requerido");
    }

    const homeTeamId = this.getReferenceId(game.homeTeam);
    const awayTeamId = this.getReferenceId(game.awayTeam);

    if (eventData.team !== homeTeamId && eventData.team !== awayTeamId) {
      throw new Error("El equipo del evento no participa en este partido");
    }

    const safePoints = eventData.points === undefined ? undefined : Math.max(0, eventData.points);
    const event: GameEvent = {
      quarter: eventData.quarter,
      type: eventData.type,
      team: eventData.team,
      ...(eventData.player ? { player: eventData.player } : {}),
      points: safePoints,
      description: this.getEventDescription(eventData.type, safePoints),
    };

    const nextScore = safePoints && safePoints > 0 ? this.addEventPointsToScore(game, eventData.team, eventData.quarter, safePoints) : undefined;
    const updatedGame = await this.gameRepo.addEvent(id, event, nextScore);

    if (nextScore) {
      await this.recalculateStandingsForGame(updatedGame);
    }

    return updatedGame;
  }

  /**
   * Elimina un evento del historial y recalcula el marcador.
   */
  async removeGameEvent(id: string, eventId: string): Promise<Game> {
    const game = await this.gameRepo.findById(id);
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    if (game.status !== "in_progress") {
      throw new Error("Solo se pueden eliminar eventos de partidos en progreso");
    }

    const gameWithEvents = game as Game & { events?: StoredGameEvent[] };
    const remainingEvents = (gameWithEvents.events || []).filter((event) => this.getReferenceId(event._id) !== eventId);

    if (remainingEvents.length === (gameWithEvents.events || []).length) {
      throw new Error("Evento no encontrado");
    }

    const recalculatedScore = this.recalculateScoreFromEvents(game, remainingEvents);
    const updatedGame = await this.gameRepo.removeEvent(id, eventId, recalculatedScore);

    await this.recalculateStandingsForGame(updatedGame);

    return updatedGame;
  }

  /**
   * Inicia un partido con jugadores presentes
   */
  async startGame(id: string, presentPlayers: { home: string[]; away: string[] }): Promise<Game> {
    // Validar mínimo de jugadores antes de intentar la actualización atómica
    if (presentPlayers.home.length < 4) {
      throw new Error("Se requieren al menos 4 jugadores del equipo local");
    }

    if (presentPlayers.away.length < 4) {
      throw new Error("Se requieren al menos 4 jugadores del equipo visitante");
    }

    // Actualizar en DB con validación atómica del estado
    const updatedGame = await this.gameRepo.startGame(id, presentPlayers);
    await this.recalculateStandingsForGame(updatedGame);

    return updatedGame;
  }

  /**
   * Completa un partido y recalcula standings
   */
  async completeGame(id: string): Promise<Game> {
    const game = await this.gameRepo.findById(id);
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    if (game.status !== "in_progress") {
      throw new Error("Solo se pueden completar partidos en progreso");
    }

    // Actualizar en DB
    const updatedGame = await this.gameRepo.updateStatus(id, "completed");

    // Recalcular standings
    await this.recalculateStandingsForGame(updatedGame);

    return updatedGame;
  }

  /**
   * Recalcula los standings para ambos equipos de un partido
   */
  private async recalculateStandingsForGame(game: Game): Promise<void> {
    if (!game.homeTeam || !game.awayTeam) {
      return;
    }

    const homeTeamId = this.getReferenceId(game.homeTeam);
    const awayTeamId = this.getReferenceId(game.awayTeam);
    const tournamentId = this.getReferenceId(game.tournament);
    const divisionId = this.getReferenceId(game.division);

    await Promise.all([
      this.standingService.recalculateForTeam(homeTeamId, tournamentId, divisionId),
      this.standingService.recalculateForTeam(awayTeamId, tournamentId, divisionId),
    ]);
  }

  private getReferenceId(reference: unknown): string {
    if (!reference) return "";
    if (typeof reference === "string") return reference;

    if (typeof reference === "object" && "_id" in reference) {
      const id = (reference as { _id?: unknown })._id;
      return id ? id.toString() : "";
    }

    return reference.toString();
  }

  private addEventPointsToScore(game: Game, teamId: string, quarter: number, points: number): GameScore {
    const homeTeamId = this.getReferenceId(game.homeTeam);
    const isHome = teamId === homeTeamId;
    const target = isHome ? game.score.home : game.score.away;
    const quarterKey = quarter === 5 ? "overtime" : (`q${quarter}` as "q1" | "q2" | "q3" | "q4");
    const nextTarget = {
      q1: target.q1,
      q2: target.q2,
      q3: target.q3,
      q4: target.q4,
      overtime: target.overtime || 0,
      [quarterKey]: (target[quarterKey] || 0) + points,
    };

    const other = isHome ? game.score.away : game.score.home;

    return new GameScore(
      new QuarterScore(
        isHome ? nextTarget.q1 : other.q1,
        isHome ? nextTarget.q2 : other.q2,
        isHome ? nextTarget.q3 : other.q3,
        isHome ? nextTarget.q4 : other.q4,
        isHome ? nextTarget.overtime : other.overtime || 0,
      ),
      new QuarterScore(
        isHome ? other.q1 : nextTarget.q1,
        isHome ? other.q2 : nextTarget.q2,
        isHome ? other.q3 : nextTarget.q3,
        isHome ? other.q4 : nextTarget.q4,
        isHome ? other.overtime || 0 : nextTarget.overtime,
      ),
    );
  }

  private recalculateScoreFromEvents(game: Game, events: StoredGameEvent[]): GameScore {
    const totals = {
      home: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
      away: { q1: 0, q2: 0, q3: 0, q4: 0, overtime: 0 },
    };

    const homeTeamId = this.getReferenceId(game.homeTeam);

    for (const event of events) {
      if (!event.points || event.points <= 0) {
        continue;
      }

      const teamId = this.getReferenceId(event.team);
      const side = teamId === homeTeamId ? totals.home : totals.away;
      const quarterKey = event.quarter === 5 ? "overtime" : (`q${event.quarter}` as keyof typeof side);

      side[quarterKey] += event.points;
    }

    return new GameScore(
      new QuarterScore(totals.home.q1, totals.home.q2, totals.home.q3, totals.home.q4, totals.home.overtime),
      new QuarterScore(totals.away.q1, totals.away.q2, totals.away.q3, totals.away.q4, totals.away.overtime),
    );
  }

  private getEventDescription(type: GameEventType, points?: number): string {
    const labels: Record<GameEventType, string> = {
      touchdown: "Touchdown",
      extra_point: "Punto extra",
      field_goal: "Field goal",
      safety: "Safety",
      interception: "Intercepción",
      fumble: "Fumble",
      penalty: "Castigo",
      timeout: "Tiempo fuera",
      quarter_end: "Fin de cuarto",
      game_end: "Fin del partido",
      substitution: "Sustitución",
      injury: "Lesión",
      first_down: "Primero y diez",
      sack: "Sack",
    };

    if (type === "quarter_end") return "Fin de mitad";

    return points && points > 0 ? `${labels[type]} (+${points})` : labels[type];
  }

  /**
   * Obtiene un partido por ID
   */
  async getGameById(id: string): Promise<Game | null> {
    return await this.gameRepo.findById(id);
  }

  /**
   * Obtiene partidos con filtros
   */
  async listGames(filters: {
    tournament?: string;
    team?: string;
    division?: string;
    status?: GameStatus;
  }): Promise<Game[]> {
    if (filters.team) {
      const gamesByTeam = await this.gameRepo.findByTeam(filters.team);
      return gamesByTeam.filter((game) => {
        if (filters.tournament && this.getReferenceId(game.tournament) !== filters.tournament) {
          return false;
        }

        if (filters.division && this.getReferenceId(game.division) !== filters.division) {
          return false;
        }

        if (filters.status && game.status !== filters.status) {
          return false;
        }

        return true;
      });
    }

    const queryFilters: {
      tournament?: string;
      division?: string;
      status?: GameStatus;
    } = {};

    if (filters.tournament) queryFilters.tournament = filters.tournament;
    if (filters.division) queryFilters.division = filters.division;
    if (filters.status) queryFilters.status = filters.status;

    return await this.gameRepo.findAll(queryFilters);
  }

  /**
   * Actualiza información de un partido
   */
  async updateGame(
    id: string,
    data: Partial<{
      homeTeam: string;
      awayTeam: string;
      scheduledDate: Date;
      status: GameStatus;
      week: number;
      round: string;
    }>,
  ): Promise<Game> {
    const game = await this.gameRepo.findById(id);
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    // Crear nuevo game con datos actualizados
    const normalizedVenue = new Venue(game.venue.name, game.venue.address);
    const normalizedScore = new GameScore(
      new QuarterScore(
        game.score.home.q1,
        game.score.home.q2,
        game.score.home.q3,
        game.score.home.q4,
        game.score.home.overtime || 0,
      ),
      new QuarterScore(
        game.score.away.q1,
        game.score.away.q2,
        game.score.away.q3,
        game.score.away.q4,
        game.score.away.overtime || 0,
      ),
    );

    const updatedGame = new Game(
      this.getReferenceId(game.tournament),
      this.getReferenceId(game.division),
      normalizedVenue,
      data.scheduledDate || game.scheduledDate,
      data.status || game.status,
      data.homeTeam || this.getReferenceId(game.homeTeam),
      data.awayTeam || this.getReferenceId(game.awayTeam),
      normalizedScore,
      game.statistics,
      data.week !== undefined ? data.week : game.week,
      data.round || game.round,
      game.actualStartTime,
      game.actualEndTime,
      game.notes,
      game.id,
      game.createdAt,
      game.updatedAt,
    );

    // Validar
    const validation = updatedGame.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    const savedGame = await this.gameRepo.update(id, updatedGame);

    if (savedGame.status === "in_progress" || savedGame.status === "completed") {
      await this.recalculateStandingsForGame(savedGame);
    }

    return savedGame;
  }

  /**
   * Elimina un partido
   */
  async deleteGame(id: string): Promise<void> {
    const game = await this.gameRepo.findById(id);
    if (!game) {
      throw new Error("Partido no encontrado");
    }

    if (game.status === "completed") {
      throw new Error("No se puede eliminar un partido completado");
    }

    await this.gameRepo.delete(id);
  }
}
