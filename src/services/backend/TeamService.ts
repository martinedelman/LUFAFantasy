import { Team, TeamStatus } from "../../entities/Team";
import { Colors } from "../../entities/valueObjects/Colors";
import { ContactInfo } from "../../entities/valueObjects/ContactInfo";
import RepositoryContainer from "../../repositories";

/**
 * Servicio de gestión de equipos
 */
export class TeamService {
  private teamRepo = RepositoryContainer.getTeamRepository();

  /**
   * Crea un nuevo equipo
   */
  async createTeam(data: {
    name: string;
    colors: { primary: string; secondary?: string };
    division: string;
    contact: {
      email?: string;
      phone?: string;
      address?: string;
      socialMedia?: {
        facebook?: string;
        instagram?: string;
        twitter?: string;
      };
    };
    shortName?: string;
    logo?: string;
    tournament?: string;
    players?: string[];
    status?: TeamStatus;
    registrationDate?: Date;
  }): Promise<Team> {
    // Verificar que el nombre no esté en uso
    const exists = await this.teamRepo.existsWithName(data.name, data.tournament);
    if (exists) {
      throw new Error("Ya existe un equipo con ese nombre");
    }

    const colors = new Colors(data.colors.primary, data.colors.secondary);
    const contact = new ContactInfo(data.contact);

    const team = new Team(
      data.name,
      colors,
      data.division,
      contact,
      data.registrationDate || new Date(),
      data.status || "active",
      data.players || [],
      data.shortName,
      data.logo,
      data.tournament,
    );

    // Validar
    const validation = team.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.teamRepo.create(team);
  }

  /**
   * Obtiene un equipo por ID
   */
  async getTeamById(id: string): Promise<Team | null> {
    return await this.teamRepo.findById(id);
  }

  /**
   * Lista equipos con filtros
   */
  async listTeams(filters?: { tournament?: string; division?: string; status?: TeamStatus }): Promise<Team[]> {
    if (!filters) {
      return await this.teamRepo.findAll();
    }

    if (filters.tournament) {
      const teamsByTournament = await this.teamRepo.findByTournament(filters.tournament);
      return teamsByTournament.filter((team) => {
        if (filters.division && (team.division as unknown as { _id?: string })?._id !== filters.division) {
          const divisionReference = team.division as unknown;
          const divisionId =
            typeof divisionReference === "string" ? divisionReference : (divisionReference as { _id?: string })?._id;

          if (divisionId !== filters.division) {
            return false;
          }
        }

        if (filters.status && team.status !== filters.status) {
          return false;
        }

        return true;
      });
    }

    const queryFilters: { division?: string; status?: TeamStatus } = {};
    if (filters.division) queryFilters.division = filters.division;
    if (filters.status) queryFilters.status = filters.status;

    return await this.teamRepo.findAll(queryFilters);
  }

  /**
   * Actualiza un equipo
   */
  async updateTeam(
    id: string,
    data: Partial<{
      name: string;
      colors: { primary: string; secondary?: string };
      shortName: string;
      logo: string;
      contact: {
        email?: string;
        phone?: string;
        address?: string;
        socialMedia?: {
          facebook?: string;
          instagram?: string;
          twitter?: string;
        };
      };
      status: TeamStatus;
      players: string[];
    }>,
  ): Promise<Team> {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new Error("Equipo no encontrado");
    }

    const updatedTeam = new Team(
      data.name || team.name,
      data.colors ? new Colors(data.colors.primary, data.colors.secondary) : team.colors,
      team.division,
      data.contact ? new ContactInfo(data.contact) : team.contact,
      team.registrationDate,
      data.status || team.status,
      data.players || team.players,
      data.shortName !== undefined ? data.shortName : team.shortName,
      data.logo !== undefined ? data.logo : team.logo,
      team.tournament,
      team.id,
      team.createdAt,
      team.updatedAt,
    );

    // Validar
    const validation = updatedTeam.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.teamRepo.update(id, updatedTeam);
  }

  /**
   * Elimina un equipo
   */
  async deleteTeam(id: string): Promise<void> {
    const team = await this.teamRepo.findById(id);
    if (!team) {
      throw new Error("Equipo no encontrado");
    }

    await this.teamRepo.delete(id);
  }
}
