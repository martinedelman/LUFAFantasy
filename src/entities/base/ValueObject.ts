/**
 * Clase base abstracta para Value Objects
 * Un Value Object no tiene identidad, se compara por valor
 * Es inmutable
 */
export abstract class ValueObject {
  /**
   * Compara dos value objects por sus propiedades
   */
  public abstract equals(vo?: ValueObject): boolean;

  /**
   * Valida que el value object sea válido
   */
  public abstract validate(): { isValid: boolean; errors: string[] };
}
