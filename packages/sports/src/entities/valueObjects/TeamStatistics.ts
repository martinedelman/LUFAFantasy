import { ValueObject } from "../base/ValueObject";

/**
 * Value Object: Estadísticas de un equipo en un partido
 * Inmutable
 */
export class TeamStatistics extends ValueObject {
  public readonly passingYards: number;
  public readonly rushingYards: number;
  public readonly totalYards: number;
  public readonly completions: number;
  public readonly attempts: number;
  public readonly interceptions: number;
  public readonly fumbles: number;
  public readonly penalties: number;
  public readonly penaltyYards: number;
  public readonly timeOfPossession?: string;
  public readonly thirdDownConversions: {
    made: number;
    attempted: number;
  };
  public readonly redZoneEfficiency: {
    scores: number;
    attempts: number;
  };

  constructor(data: {
    passingYards?: number;
    rushingYards?: number;
    totalYards?: number;
    completions?: number;
    attempts?: number;
    interceptions?: number;
    fumbles?: number;
    penalties?: number;
    penaltyYards?: number;
    timeOfPossession?: string;
    thirdDownConversions?: {
      made: number;
      attempted: number;
    };
    redZoneEfficiency?: {
      scores: number;
      attempts: number;
    };
  }) {
    super();
    this.passingYards = data.passingYards || 0;
    this.rushingYards = data.rushingYards || 0;
    this.totalYards = data.totalYards || this.passingYards + this.rushingYards;
    this.completions = data.completions || 0;
    this.attempts = data.attempts || 0;
    this.interceptions = data.interceptions || 0;
    this.fumbles = data.fumbles || 0;
    this.penalties = data.penalties || 0;
    this.penaltyYards = data.penaltyYards || 0;
    this.timeOfPossession = data.timeOfPossession;
    this.thirdDownConversions = data.thirdDownConversions || { made: 0, attempted: 0 };
    this.redZoneEfficiency = data.redZoneEfficiency || { scores: 0, attempts: 0 };
  }

  public equals(vo?: ValueObject): boolean {
    if (!vo || !(vo instanceof TeamStatistics)) {
      return false;
    }
    return (
      this.passingYards === vo.passingYards &&
      this.rushingYards === vo.rushingYards &&
      this.completions === vo.completions &&
      this.attempts === vo.attempts &&
      this.interceptions === vo.interceptions &&
      this.fumbles === vo.fumbles &&
      this.penalties === vo.penalties &&
      this.penaltyYards === vo.penaltyYards
    );
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (this.completions > this.attempts) {
      errors.push("Las completaciones no pueden ser mayores que los intentos");
    }

    if (this.thirdDownConversions.made > this.thirdDownConversions.attempted) {
      errors.push("Las conversiones de tercera oportunidad no pueden ser mayores que los intentos");
    }

    if (this.redZoneEfficiency.scores > this.redZoneEfficiency.attempts) {
      errors.push("Los scores en zona roja no pueden ser mayores que los intentos");
    }

    const negativeFields = [
      this.passingYards,
      this.rushingYards,
      this.completions,
      this.attempts,
      this.interceptions,
      this.fumbles,
      this.penalties,
      this.penaltyYards,
    ];

    if (negativeFields.some((field) => field < 0)) {
      errors.push("Las estadísticas no pueden ser negativas");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Calcula el total de yardas
   */
  public calculateTotalYards(): number {
    return this.passingYards + this.rushingYards;
  }

  /**
   * Calcula el porcentaje de completaciones
   */
  public completionPercentage(): number {
    if (this.attempts === 0) return 0;
    return (this.completions / this.attempts) * 100;
  }

  /**
   * Estadísticas vacías (para inicialización)
   */
  public static empty(): TeamStatistics {
    return new TeamStatistics({});
  }
}
