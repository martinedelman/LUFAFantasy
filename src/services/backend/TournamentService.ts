import {
  PlayoffCriteria,
  Tournament,
  TournamentStatus,
  TournamentFormat,
  TournamentRules,
  TournamentPrize,
} from "../../entities/Tournament";
import RepositoryContainer from "../../repositories";

/**
 * Servicio de gestión de torneos
 */
export class TournamentService {
  private tournamentRepo = RepositoryContainer.getTournamentRepository();
  private divisionRepo = RepositoryContainer.getDivisionRepository();
  private teamRepo = RepositoryContainer.getTeamRepository();

  private getReferenceId(reference: unknown): string {
    if (!reference) return "";
    if (typeof reference === "string") return reference;

    if (typeof reference === "object" && "_id" in reference) {
      const id = (reference as { _id?: unknown })._id;
      return id ? id.toString() : "";
    }

    return reference.toString();
  }

  private async validateParticipatingTeams(divisions: string[], participatingTeams: string[]): Promise<void> {
    for (const divisionId of divisions) {
      const division = await this.divisionRepo.findById(divisionId);
      if (!division) {
        throw new Error(`División no encontrada: ${divisionId}`);
      }
    }

    if (participatingTeams.length === 0) {
      throw new Error("Debes seleccionar al menos un equipo participante");
    }

    if (divisions.length === 0) {
      throw new Error("Debes seleccionar al menos una división para asignar equipos participantes");
    }

    const selectedDivisionIds = new Set(divisions.map((divisionId) => divisionId.toString()));

    for (const teamId of participatingTeams) {
      const team = await this.teamRepo.findById(teamId);

      if (!team) {
        throw new Error(`Equipo no encontrado: ${teamId}`);
      }

      const teamDivisionId = this.getReferenceId(team.division);
      if (!selectedDivisionIds.has(teamDivisionId)) {
        throw new Error(`El equipo ${team.name} no pertenece a las divisiones seleccionadas`);
      }
    }
  }

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
    playoffCriteria?: PlayoffCriteria;
    description?: string;
    registrationDeadline?: Date;
    divisions?: string[];
    participatingTeams?: string[];
    rules?: TournamentRules;
    prizes?: TournamentPrize[];
  }): Promise<Tournament> {
    const divisionIds = data.divisions || [];
    const participatingTeams = data.participatingTeams || [];

    await this.validateParticipatingTeams(divisionIds, participatingTeams);

    const tournament = new Tournament(
      data.name,
      data.season,
      data.year,
      data.startDate,
      data.endDate,
      data.status || "upcoming",
      data.format || "league",
      data.playoffCriteria,
      divisionIds,
      participatingTeams,
      data.description,
      data.registrationDeadline,
      data.rules,
      data.prizes,
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
      playoffCriteria: PlayoffCriteria;
      description: string;
      registrationDeadline: Date;
      divisions: string[];
      participatingTeams: string[];
      rules: TournamentRules;
      prizes: TournamentPrize[];
    }>,
  ): Promise<Tournament> {
    const tournament = await this.tournamentRepo.findById(id);
    if (!tournament) {
      throw new Error("Torneo no encontrado");
    }

    const nextDivisionIds =
      data.divisions !== undefined
        ? data.divisions
        : (tournament.divisions || []).map((divisionRef) => this.getReferenceId(divisionRef));

    const nextParticipatingTeams =
      data.participatingTeams !== undefined
        ? data.participatingTeams
        : (tournament.participatingTeams || []).map((teamRef) => this.getReferenceId(teamRef));

    await this.validateParticipatingTeams(nextDivisionIds, nextParticipatingTeams);

    const updatedTournament = new Tournament(
      data.name || tournament.name,
      data.season || tournament.season,
      data.year || tournament.year,
      data.startDate || tournament.startDate,
      data.endDate || tournament.endDate,
      data.status || tournament.status,
      data.format || tournament.format,
      data.playoffCriteria !== undefined ? data.playoffCriteria : tournament.playoffCriteria,
      nextDivisionIds,
      nextParticipatingTeams,
      data.description !== undefined ? data.description : tournament.description,
      data.registrationDeadline !== undefined ? data.registrationDeadline : tournament.registrationDeadline,
      data.rules !== undefined ? data.rules : tournament.rules,
      data.prizes !== undefined ? data.prizes : tournament.prizes,
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
