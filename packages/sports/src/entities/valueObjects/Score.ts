import { ValueObject } from "../base/ValueObject";

/**
 * Value Object: Score por cuartos
 * Inmutable
 */
export class QuarterScore extends ValueObject {
  public readonly q1: number;
  public readonly q2: number;
  public readonly q3: number;
  public readonly q4: number;
  public readonly overtime: number;
  public readonly total: number;

  constructor(q1: number, q2: number, q3: number, q4: number, overtime: number = 0) {
    super();
    this.q1 = q1;
    this.q2 = q2;
    this.q3 = q3;
    this.q4 = q4;
    this.overtime = overtime;
    this.total = this.calculateTotal();
  }

  private calculateTotal(): number {
    return this.q1 + this.q2 + this.q3 + this.q4 + this.overtime;
  }

  public equals(vo?: ValueObject): boolean {
    if (!vo || !(vo instanceof QuarterScore)) {
      return false;
    }
    return (
      this.q1 === vo.q1 && this.q2 === vo.q2 && this.q3 === vo.q3 && this.q4 === vo.q4 && this.overtime === vo.overtime
    );
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const scores = [this.q1, this.q2, this.q3, this.q4, this.overtime];
    for (const score of scores) {
      if (score < 0) {
        errors.push("Los puntajes no pueden ser negativos");
        break;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public static zero(): QuarterScore {
    return new QuarterScore(0, 0, 0, 0, 0);
  }
}

/**
 * Value Object: Score del partido completo (home + away)
 * Inmutable
 */
export class GameScore extends ValueObject {
  public readonly home: QuarterScore;
  public readonly away: QuarterScore;

  constructor(home: QuarterScore, away: QuarterScore) {
    super();
    this.home = home;
    this.away = away;
  }

  public equals(vo?: ValueObject): boolean {
    if (!vo || !(vo instanceof GameScore)) {
      return false;
    }
    return this.home.equals(vo.home) && this.away.equals(vo.away);
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    const homeValidation = this.home.validate();
    const awayValidation = this.away.validate();

    if (!homeValidation.isValid) {
      errors.push(...homeValidation.errors.map((e) => `Home: ${e}`));
    }

    if (!awayValidation.isValid) {
      errors.push(...awayValidation.errors.map((e) => `Away: ${e}`));
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Obtiene el ganador del partido
   * @returns 'home' | 'away' | 'tie'
   */
  public getWinner(): "home" | "away" | "tie" {
    if (this.home.total > this.away.total) {
      return "home";
    } else if (this.away.total > this.home.total) {
      return "away";
    }
    return "tie";
  }

  public static zero(): GameScore {
    return new GameScore(QuarterScore.zero(), QuarterScore.zero());
  }
}
