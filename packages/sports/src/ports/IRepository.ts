/**
 * Interface base para todos los repositorios
 * Define operaciones CRUD genéricas
 */
export interface IRepository<T> {
  /**
   * Busca una entidad por su ID
   */
  findById(id: string): Promise<T | null>;

  /**
   * Busca todas las entidades con filtros opcionales
   */
  findAll(filters?: Record<string, unknown>): Promise<T[]>;

  /**
   * Crea una nueva entidad
   */
  create(data: Partial<T>): Promise<T>;

  /**
   * Actualiza una entidad existente
   */
  update(id: string, data: Partial<T>): Promise<T>;

  /**
   * Elimina una entidad
   */
  delete(id: string): Promise<void>;

  /**
   * Verifica si existe una entidad con el ID dado
   */
  exists(id: string): Promise<boolean>;
}
