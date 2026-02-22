/**
 * Clase base abstracta para todas las entidades del dominio
 * Una entidad tiene identidad única y ciclo de vida
 */
export abstract class Entity {
  public readonly id?: string;
  public readonly createdAt?: Date;
  public readonly updatedAt?: Date;

  constructor(id?: string, createdAt?: Date, updatedAt?: Date) {
    this.id = id;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
  }

  /**
   * Compara dos entidades por su identidad
   */
  public equals(entity?: Entity): boolean {
    if (!entity) {
      return false;
    }

    if (this === entity) {
      return true;
    }

    return this.id === entity.id;
  }

  /**
   * Verifica si la entidad tiene ID (ya fue persistida)
   */
  public isPersisted(): boolean {
    return !!this.id;
  }
}
