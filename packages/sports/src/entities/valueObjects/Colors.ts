import { ValueObject } from "../base/ValueObject";

/**
 * Value Object: Colores de un equipo
 * Inmutable
 */
export class Colors extends ValueObject {
  public readonly primary: string;
  public readonly secondary?: string;

  constructor(primary: string, secondary?: string) {
    super();
    this.primary = primary;
    this.secondary = secondary;
  }

  public equals(vo?: ValueObject): boolean {
    if (!vo || !(vo instanceof Colors)) {
      return false;
    }
    return this.primary === vo.primary && this.secondary === vo.secondary;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.primary || this.primary.trim().length === 0) {
      errors.push("El color primario es requerido");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}
