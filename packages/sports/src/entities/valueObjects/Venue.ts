import { ValueObject } from "../base/ValueObject";

/**
 * Value Object: Venue (lugar donde se juega un partido)
 * Inmutable
 */
export class Venue extends ValueObject {
  public readonly name: string;
  public readonly address: string;

  constructor(name: string, address: string) {
    super();
    this.name = name;
    this.address = address;
  }

  public equals(vo?: ValueObject): boolean {
    if (!vo || !(vo instanceof Venue)) {
      return false;
    }
    return this.name === vo.name && this.address === vo.address;
  }

  public validate(): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("El nombre del venue es requerido");
    }

    if (!this.address || this.address.trim().length === 0) {
      errors.push("La dirección del venue es requerida");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  public toString(): string {
    return `${this.name} - ${this.address}`;
  }
}
