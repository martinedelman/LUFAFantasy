import { AggregateRoot } from "./base/AggregateRoot";
import { Game } from "./Game";

/**
 * Entity: Standing (Posiciones / Tabla de posiciones)
 * Aggregate Root
 */
export class Standing extends AggregateRoot {
  public readonly division: string; // ID de la división
  public readonly team: string; // ID del equipo
  public readonly tournament: string; // ID del torneo
  public readonly position: number;
  public readonly wins: number;
  public readonly losses: number;
  public readonly ties: number;
  public readonly pointsFor: number;
  public readonly pointsAgainst: number;
  public readonly pointsDifferential: number;
  public readonly percentage: number;
  public readonly streak?: string; // "W3", "L2", etc.
  public readonly lastFiveGames?: string; // "WWLWW"

  constructor(
    division: string,
    team: string,
    tournament: string,
    wins: number = 0,
    losses: number = 0,
    ties: number = 0,
    pointsFor: number = 0,
    pointsAgainst: number = 0,
    position: number = 0,
    streak?: string,
    lastFiveGames?: string,
    id?: string,
    createdAt?: Date,
    updatedAt?: Date,
  ) {
    super(id, createdAt, updatedAt);
    this.division = division;
    this.team = team;
    this.tournament = tournament;
    this.position = position;
    this.wins = wins;
    this.losses = losses;
    this.ties = ties;
    this.pointsFor = pointsFor;
    this.pointsAgainst = pointsAgainst;
    this.pointsDifferential = pointsFor - pointsAgainst;
    this.percentage = this.calculateWinPercentage();
    this.streak = streak;
    this.lastFiveGames = lastFiveGames;
  }

  /**
   * Calcula el porcentaje de victorias
   */
  private calculateWinPercentage(): number {
    const totalGames = this.wins + this.losses + this.ties;
    if (totalGames === 0) return 0;

    // Ties cuentan como medio juego ganado
    const adjustedWins = this.wins + this.ties * 0.5;
    return adjustedWins / totalGames;
  }

  /**
   * Obtiene el porcentaje de victorias como número entre 0 y 1
   */
  public winPercentage(): number {
    return this.percentage;
  }

  /**
   * Obtiene el porcentaje de victorias formateado (ej: ".750")
   */
  public winPercentageFormatted(): string {
    return this.percentage.toFixed(3);
  }

  /**
   * Calcula la diferencia de puntos
   */
  public pointDifferential(): number {
    return this.pointsDifferential;
  }

  /**
   * Obtiene el número total de partidos jugados
   */
  public gamesPlayed(): number {
    return this.wins + this.losses + this.ties;
  }

  /**
   * Actualiza el standing desde un partido completado
   */
  public updateFromGame(game: Game): Standing {
    if (!game.isCompleted()) {
      throw new Error("Solo se pueden actualizar standings desde partidos completados");
    }

    if (!game.hasTeam(this.team)) {
      throw new Error("El partido no involucra a este equipo");
    }

    const teamScore = game.getTeamScore(this.team);
    const opponentScore = game.getOpponentScore(this.team);

    if (!teamScore || !opponentScore) {
      throw new Error("No se pudieron obtener los scores del partido");
    }

    let newWins = this.wins;
    let newLosses = this.losses;
    let newTies = this.ties;

    const winner = game.getWinner();
    if (winner === this.team) {
      newWins++;
    } else if (winner === null) {
      // Empate
      newTies++;
    } else {
      newLosses++;
    }

    const newPointsFor = this.pointsFor + teamScore.total;
    const newPointsAgainst = this.pointsAgainst + opponentScore.total;

    return new Standing(
      this.division,
      this.team,
      this.tournament,
      newWins,
      newLosses,
      newTies,
      newPointsFor,
      newPointsAgainst,
      this.position,
      undefined,
      undefined,
      this.id,
      this.createdAt,
      this.updatedAt,
    );
  }

  /**
   * Compara dos standings para ordenamiento
   * @returns número negativo si this < other, positivo si this > other, 0 si iguales
   */
  public compareTo(other: Standing): number {
    // Primero por porcentaje de victorias (mayor es mejor)
    if (this.percentage !== other.percentage) {
      return other.percentage - this.percentage;
    }

    // Luego por diferencial de puntos (mayor es mejor)
    if (this.pointsDifferential !== other.pointsDifferential) {
      return other.pointsDifferential - this.pointsDifferential;
    }

    // Finalmente por puntos a favor (mayor es mejor)
    return other.pointsFor - this.pointsFor;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.division) {
      errors.push("La división es requerida");
    }

    if (!this.team) {
      errors.push("El equipo es requerido");
    }

    if (!this.tournament) {
      errors.push("El torneo es requerido");
    }

    if (this.wins < 0 || this.losses < 0 || this.ties < 0) {
      errors.push("Las victorias, derrotas y empates no pueden ser negativos");
    }

    if (this.pointsFor < 0 || this.pointsAgainst < 0) {
      errors.push("Los puntos no pueden ser negativos");
    }

    if (this.percentage < 0 || this.percentage > 1) {
      errors.push("El porcentaje debe estar entre 0 y 1");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Crea un standing inicial para un equipo
   */
  public static createInitial(division: string, team: string, tournament: string): Standing {
    return new Standing(division, team, tournament);
  }
}
