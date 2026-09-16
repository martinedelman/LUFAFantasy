import { Entity } from "./Entity";

/**
 * Clase base para Aggregate Roots
 * Un Aggregate Root es el punto de entrada a un agregado
 * y mantiene la consistencia del agregado completo
 */
export abstract class AggregateRoot extends Entity {
  /**
   * Valida todo el agregado y sus invariantes
   */
  public abstract validate(): { isValid: boolean; errors: string[] };
}
