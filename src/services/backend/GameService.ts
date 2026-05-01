import { Game, GameStatus } from "../../entities/Game";
import { GameScore, QuarterScore } from "../../entities/valueObjects/Score";
import { Venue } from "../../entities/valueObjects/Venue";
import RepositoryContainer from "../../repositories";
import { StandingService } from "./StandingService";

interface ScoreUpdate {
  home: { q1: number; q2: number; q3: number; q4: number; overtime?: number };
  away: { q1: number; q2: number; q3: number; q4: number; overtime?: number };
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
    if (filters.tournament) {
      return await this.gameRepo.findByTournament(filters.tournament);
    }

    if (filters.team) {
      return await this.gameRepo.findByTeam(filters.team);
    }

    if (filters.division) {
      return await this.gameRepo.findByDivision(filters.division);
    }

    if (filters.status) {
      return await this.gameRepo.findByStatus(filters.status);
    }

    return await this.gameRepo.findAll(filters);
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
