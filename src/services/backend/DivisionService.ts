import { Division, DivisionCategory } from "../../entities/Division";
import RepositoryContainer from "../../repositories";

/**
 * Servicio de gestión de divisiones
 */
export class DivisionService {
  private divisionRepo = RepositoryContainer.getDivisionRepository();

  /**
   * Crea una nueva división
   */
  async createDivision(data: {
    name: string;
    category: DivisionCategory;
    ageGroup?: string;
    tournament?: string;
    maxTeams?: number;
    teams?: string[];
  }): Promise<Division> {
    const division = new Division(
      data.name,
      data.category,
      data.teams || [],
      data.ageGroup,
      data.tournament,
      data.maxTeams,
    );

    // Validar
    const validation = division.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.divisionRepo.create(division);
  }

  /**
   * Obtiene una división por ID
   */
  async getDivisionById(id: string): Promise<Division | null> {
    return await this.divisionRepo.findById(id);
  }

  /**
   * Lista divisiones con filtros
   */
  async listDivisions(filters?: { tournament?: string; category?: DivisionCategory }): Promise<Division[]> {
    if (filters?.tournament) {
      return await this.divisionRepo.findByTournament(filters.tournament);
    }

    return await this.divisionRepo.findAll(filters);
  }

  /**
   * Actualiza una división
   */
  async updateDivision(
    id: string,
    data: Partial<{
      name: string;
      category: DivisionCategory;
      ageGroup: string;
      maxTeams: number;
      teams: string[];
    }>,
  ): Promise<Division> {
    const existingDivision = await this.divisionRepo.findById(id);
    if (!existingDivision) {
      throw new Error("División no encontrada");
    }

    // Crear nueva instancia con campos actualizados
    const updatedDivision = new Division(
      data.name !== undefined ? data.name : existingDivision.name,
      data.category !== undefined ? data.category : existingDivision.category,
      data.teams !== undefined ? data.teams : existingDivision.teams,
      data.ageGroup !== undefined ? data.ageGroup : existingDivision.ageGroup,
      existingDivision.tournament,
      data.maxTeams !== undefined ? data.maxTeams : existingDivision.maxTeams,
      existingDivision.id,
      existingDivision.createdAt,
      existingDivision.updatedAt,
    );

    // Validar
    const validation = updatedDivision.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.divisionRepo.update(id, updatedDivision);
  }

  /**
   * Añade un equipo a una división
   */
  async addTeamToDivision(divisionId: string, teamId: string): Promise<Division> {
    const division = await this.divisionRepo.findById(divisionId);
    if (!division) {
      throw new Error("División no encontrada");
    }

    if (!division.canAddTeam()) {
      throw new Error("La división ha alcanzado el máximo de equipos");
    }

    if (division.hasTeam(teamId)) {
      throw new Error("El equipo ya está en esta división");
    }

    const updatedTeams = [...division.teams, teamId];
    const updatedDivision = new Division(
      division.name,
      division.category,
      updatedTeams,
      division.ageGroup,
      division.tournament,
      division.maxTeams,
      division.id,
      division.createdAt,
      division.updatedAt,
    );

    return await this.divisionRepo.update(divisionId, updatedDivision);
  }

  /**
   * Elimina un equipo de una división
   */
  async removeTeamFromDivision(divisionId: string, teamId: string): Promise<Division> {
    const division = await this.divisionRepo.findById(divisionId);
    if (!division) {
      throw new Error("División no encontrada");
    }

    if (!division.hasTeam(teamId)) {
      throw new Error("El equipo no está en esta división");
    }

    const updatedTeams = division.teams.filter((id) => id !== teamId);
    const updatedDivision = new Division(
      division.name,
      division.category,
      updatedTeams,
      division.ageGroup,
      division.tournament,
      division.maxTeams,
      division.id,
      division.createdAt,
      division.updatedAt,
    );

    return await this.divisionRepo.update(divisionId, updatedDivision);
  }

  /**
   * Elimina una división
   */
  async deleteDivision(id: string): Promise<void> {
    const division = await this.divisionRepo.findById(id);
    if (!division) {
      throw new Error("División no encontrada");
    }

    // Validar que la división no tenga equipos
    if (division.teams.length > 0) {
      throw new Error("No se puede eliminar una división que tiene equipos asignados");
    }

    await this.divisionRepo.delete(id);
  }
}
