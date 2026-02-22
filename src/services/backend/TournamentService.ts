import { Tournament, TournamentStatus, TournamentFormat } from "../../entities/Tournament";
import RepositoryContainer from "../../repositories";

/**
 * Servicio de gestión de torneos
 */
export class TournamentService {
  private tournamentRepo = RepositoryContainer.getTournamentRepository();

  /**
   * Crea un nuevo torneo
   */
  async createTournament(data: {
    name: string;
    season: string;
    year: number;
    startDate: Date;
    endDate: Date;
    status?: TournamentStatus;
    format?: TournamentFormat;
    description?: string;
    registrationDeadline?: Date;
    divisions?: string[];
  }): Promise<Tournament> {
    const tournament = new Tournament(
      data.name,
      data.season,
      data.year,
      data.startDate,
      data.endDate,
      data.status || "upcoming",
      data.format || "league",
      data.divisions || [],
      data.description,
      data.registrationDeadline,
    );

    // Validar
    const validation = tournament.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.tournamentRepo.create(tournament);
  }

  /**
   * Obtiene un torneo por ID
   */
  async getTournamentById(id: string): Promise<Tournament | null> {
    return await this.tournamentRepo.findById(id);
  }

  /**
   * Lista torneos con filtros
   */
  async listTournaments(filters?: {
    status?: TournamentStatus;
    year?: number;
    season?: string;
  }): Promise<Tournament[]> {
    if (filters?.status) {
      return await this.tournamentRepo.findByStatus(filters.status);
    }

    if (filters?.year && filters?.season) {
      return await this.tournamentRepo.findBySeasonAndYear(filters.season, filters.year);
    }

    if (filters?.year) {
      return await this.tournamentRepo.findByYear(filters.year);
    }

    return await this.tournamentRepo.findAll(filters);
  }

  /**
   * Obtiene torneos activos
   */
  async getActiveTournaments(): Promise<Tournament[]> {
    return await this.tournamentRepo.findActiveTournaments();
  }

  /**
   * Actualiza un torneo
   */
  async updateTournament(
    id: string,
    data: Partial<{
      name: string;
      season: string;
      year: number;
      startDate: Date;
      endDate: Date;
      status: TournamentStatus;
      format: TournamentFormat;
      description: string;
      registrationDeadline: Date;
      divisions: string[];
    }>,
  ): Promise<Tournament> {
    const tournament = await this.tournamentRepo.findById(id);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    const updatedTournament = new Tournament(
      data.name || tournament.name,
      data.season || tournament.season,
      data.year || tournament.year,
      data.startDate || tournament.startDate,
      data.endDate || tournament.endDate,
      data.status || tournament.status,
      data.format || tournament.format,
      data.divisions || tournament.divisions,
      data.description !== undefined ? data.description : tournament.description,
      data.registrationDeadline !== undefined ? data.registrationDeadline : tournament.registrationDeadline,
      tournament.id,
      tournament.createdAt,
      tournament.updatedAt,
    );

    // Validar
    const validation = updatedTournament.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.tournamentRepo.update(id, updatedTournament);
  }

  /**
   * Elimina un torneo
   */
  async deleteTournament(id: string): Promise<void> {
    const tournament = await this.tournamentRepo.findById(id);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    if (tournament.status !== "upcoming" && tournament.status !== "cancelled") {
      throw new Error("Solo se pueden eliminar torneos en estado upcoming o cancelled");
    }

    await this.tournamentRepo.delete(id);
  }
}
