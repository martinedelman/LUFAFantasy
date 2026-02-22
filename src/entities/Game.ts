import { AggregateRoot } from "./base/AggregateRoot";
import { Venue } from "./valueObjects/Venue";
import { GameScore, QuarterScore } from "./valueObjects/Score";
import { TeamStatistics } from "./valueObjects/TeamStatistics";

export type GameStatus = "scheduled" | "in_progress" | "completed" | "postponed" | "cancelled";

export interface GameStatistics {
  home: TeamStatistics;
  away: TeamStatistics;
}

/**
 * Entity: Game (Partido)
 * Aggregate Root - Entidad más compleja del dominio
 */
export class Game extends AggregateRoot {
  public readonly tournament: string; // ID del torneo
  public readonly division: string; // ID de la división
  public readonly homeTeam: string | null; // ID del equipo local (o TBD)
  public readonly awayTeam: string | null; // ID del equipo visitante (o TBD)
  public readonly venue: Venue;
  public readonly scheduledDate: Date;
  public readonly actualStartTime?: Date;
  public readonly actualEndTime?: Date;
  public readonly status: GameStatus;
  public readonly week?: number;
  public readonly round?: string;
  public readonly score: GameScore;
  public readonly statistics: GameStatistics;
  public readonly notes?: string;

  constructor(
    tournament: string,
    division: string,
    venue: Venue,
    scheduledDate: Date,
    status: GameStatus = "scheduled",
    homeTeam: string | null = null,
    awayTeam: string | null = null,
    score?: GameScore,
    statistics?: GameStatistics,
    week?: number,
    round?: string,
    actualStartTime?: Date,
    actualEndTime?: Date,
    notes?: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.tournament = tournament;
    this.division = division;
    this.homeTeam = homeTeam;
    this.awayTeam = awayTeam;
    this.venue = venue;
    this.scheduledDate = scheduledDate;
    this.actualStartTime = actualStartTime;
    this.actualEndTime = actualEndTime;
    this.status = status;
    this.week = week;
    this.round = round;
    this.score = score || GameScore.zero();
    this.statistics = statistics || {
      home: TeamStatistics.empty(),
      away: TeamStatistics.empty(),
    };
    this.notes = notes;
  }

  /**
   * Calcula el score del partido basado en los cuartos
   */
  public calculateScore(
    homeQuarters: { q1: number; q2: number; q3: number; q4: number; overtime?: number },
    awayQuarters: { q1: number; q2: number; q3: number; q4: number; overtime?: number },
  ): GameScore {
    const homeScore = new QuarterScore(
      homeQuarters.q1,
      homeQuarters.q2,
      homeQuarters.q3,
      homeQuarters.q4,
      homeQuarters.overtime || 0,
    );

    const awayScore = new QuarterScore(
      awayQuarters.q1,
      awayQuarters.q2,
      awayQuarters.q3,
      awayQuarters.q4,
      awayQuarters.overtime || 0,
    );

    return new GameScore(homeScore, awayScore);
  }

  /**
   * Verifica si el partido puede comenzar
   */
  public canStart(): boolean {
    return (
      this.status === "scheduled" && this.homeTeam !== null && this.awayTeam !== null && this.homeTeam !== this.awayTeam
    );
  }

  /**
   * Marca el partido como iniciado
   */
  public start(): Game {
    if (!this.canStart()) {
      throw new Error("El partido no puede iniciar en su estado actual");
    }

    return new Game(
      this.tournament,
      this.division,
      this.venue,
      this.scheduledDate,
      "in_progress",
      this.homeTeam,
      this.awayTeam,
      this.score,
      this.statistics,
      this.week,
      this.round,
      new Date(),
      this.actualEndTime,
      this.notes,
      this.id,
      this.createdAt,
      this.updatedAt,
    );
  }

  /**
   * Marca el partido como completado
   */
  public complete(): Game {
    if (this.status !== "in_progress") {
      throw new Error("Solo se pueden completar partidos en progreso");
    }

    return new Game(
      this.tournament,
      this.division,
      this.venue,
      this.scheduledDate,
      "completed",
      this.homeTeam,
      this.awayTeam,
      this.score,
      this.statistics,
      this.week,
      this.round,
      this.actualStartTime,
      new Date(),
      this.notes,
      this.id,
      this.createdAt,
      this.updatedAt,
    );
  }

  /**
   * Verifica si el partido está completado
   */
  public isCompleted(): boolean {
    return this.status === "completed";
  }

  /**
   * Verifica si el partido está en progreso
   */
  public isInProgress(): boolean {
    return this.status === "in_progress";
  }

  /**
   * Obtiene el ganador del partido
   * @returns ID del equipo ganador o null si es empate o no completado
   */
  public getWinner(): string | null {
    if (!this.isCompleted()) {
      return null;
    }

    const winner = this.score.getWinner();
    if (winner === "home") return this.homeTeam;
    if (winner === "away") return this.awayTeam;
    return null;
  }

  /**
   * Obtiene el perdedor del partido
   */
  public getLoser(): string | null {
    if (!this.isCompleted()) {
      return null;
    }

    const winner = this.score.getWinner();
    if (winner === "home") return this.awayTeam;
    if (winner === "away") return this.homeTeam;
    return null;
  }

  /**
   * Verifica si el partido terminó en empate
   */
  public isTie(): boolean {
    return this.isCompleted() && this.score.getWinner() === "tie";
  }

  /**
   * Verifica si un equipo participó en este partido
   */
  public hasTeam(teamId: string): boolean {
    return this.homeTeam === teamId || this.awayTeam === teamId;
  }

  /**
   * Obtiene el score de un equipo específico
   */
  public getTeamScore(teamId: string): QuarterScore | null {
    if (this.homeTeam === teamId) return this.score.home;
    if (this.awayTeam === teamId) return this.score.away;
    return null;
  }

  /**
   * Obtiene el score del oponente de un equipo
   */
  public getOpponentScore(teamId: string): QuarterScore | null {
    if (this.homeTeam === teamId) return this.score.away;
    if (this.awayTeam === teamId) return this.score.home;
    return null;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.tournament) {
      errors.push("El torneo es requerido");
    }

    if (!this.division) {
      errors.push("La división es requerida");
    }

    const venueValidation = this.venue.validate();
    if (!venueValidation.isValid) {
      errors.push(...venueValidation.errors);
    }

    if (this.homeTeam && this.awayTeam && this.homeTeam === this.awayTeam) {
      errors.push("Un equipo no puede jugar contra sí mismo");
    }

    if (!["scheduled", "in_progress", "completed", "postponed", "cancelled"].includes(this.status)) {
      errors.push("Estado del partido inválido");
    }

    // Validar que si el partido está completado, debe tener equipos
    if (this.status === "completed" || this.status === "in_progress") {
      if (!this.homeTeam || !this.awayTeam) {
        errors.push("Un partido en progreso o completado debe tener ambos equipos asignados");
      }
    }

    const scoreValidation = this.score.validate();
    if (!scoreValidation.isValid) {
      errors.push(...scoreValidation.errors);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
