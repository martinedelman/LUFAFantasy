import { EmergencyContact, Player, PlayerPosition, PlayerStatus } from "../../entities/Player";
import RepositoryContainer from "../../repositories";

/**
 * Servicio de gestión de jugadores
 */
export class PlayerService {
  private playerRepo = RepositoryContainer.getPlayerRepository();
  private teamRepo = RepositoryContainer.getTeamRepository();

  private getReferenceId(value: unknown): string {
    if (!value) {
      return "";
    }

    if (typeof value === "string") {
      return value;
    }

    const reference = value as { _id?: unknown; id?: unknown; toString?: () => string };
    const id = reference._id || reference.id;
    if (id) {
      return String(id);
    }

    return reference.toString ? reference.toString() : "";
  }

  private normalizeJerseyNumber(value: unknown): number | null | undefined {
    if (value === undefined) {
      return undefined;
    }

    if (value === null || value === "") {
      return null;
    }

    const parsedValue = typeof value === "number" ? value : Number(value);

    if (Number.isNaN(parsedValue)) {
      throw new Error("Número de camiseta inválido");
    }

    return parsedValue;
  }

  /**
   * Crea un nuevo jugador
   */
  async createPlayer(data: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
    dateOfBirth: Date;
    team: string;
    jerseyNumber?: number | null;
    position: PlayerPosition;
    secondaryPosition?: PlayerPosition;
    email?: string;
    phone?: string;
    height?: number;
    weight?: number;
    experience?: string;
    emergencyContact?: EmergencyContact;
    status?: PlayerStatus;
    registrationDate?: Date;
  }): Promise<Player> {
    const jerseyNumber = this.normalizeJerseyNumber(data.jerseyNumber);

    // Verificar que el equipo existe
    const team = await this.teamRepo.findById(data.team);
    if (!team) {
      throw new Error("Equipo no encontrado");
    }

    // Verificar que el número de camiseta no esté en uso en el equipo
    if (jerseyNumber !== undefined && jerseyNumber !== null) {
      const numberExists = await this.playerRepo.existsWithJerseyNumber(jerseyNumber, data.team);
      if (numberExists) {
        throw new Error("El número de camiseta ya está en uso en este equipo");
      }
    }

    const player = new Player(
      data.firstName,
      data.lastName,
      data.dateOfBirth,
      data.team,
      jerseyNumber,
      data.position,
      data.secondaryPosition,
      data.registrationDate || new Date(),
      data.status || "active",
      data.email,
      data.phone,
      data.height,
      data.weight,
      data.experience,
      undefined,
      undefined,
      undefined,
      data.profilePicture,
      data.emergencyContact,
    );

    // Validar
    const validation = player.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.playerRepo.create(player);
  }

  /**
   * Obtiene un jugador por ID
   */
  async getPlayerById(id: string): Promise<Player | null> {
    return await this.playerRepo.findById(id);
  }

  /**
   * Lista jugadores con filtros
   */
  async listPlayers(filters?: {
    team?: string;
    position?: PlayerPosition;
    status?: PlayerStatus;
    search?: string;
  }): Promise<Player[]> {
    if (!filters) {
      return await this.playerRepo.findAll();
    }

    const { search, team, position, status } = filters;

    if (search) {
      const searchResults = await this.playerRepo.searchByName(search);
      return searchResults.filter((player) => {
        if (team && String((player.team as unknown as { _id?: string })?._id || player.team) !== team) {
          return false;
        }

        if (position && player.position !== position) {
          return false;
        }

        if (status && player.status !== status) {
          return false;
        }

        return true;
      });
    }

    const queryFilters: {
      team?: string;
      position?: PlayerPosition;
      status?: PlayerStatus;
    } = {};
    if (team) queryFilters.team = team;
    if (position) queryFilters.position = position;
    if (status) queryFilters.status = status;

    return await this.playerRepo.findAll(queryFilters);
  }

  /**
   * Busca jugadores por nombre
   */
  async searchPlayers(query: string): Promise<Player[]> {
    return await this.playerRepo.searchByName(query);
  }

  /**
   * Actualiza un jugador
   */
  async updatePlayer(
    id: string,
    data: Partial<{
      firstName: string;
      lastName: string;
      profilePicture: string;
      dateOfBirth: Date;
      team: string;
      jerseyNumber?: number | null;
      position: PlayerPosition;
      secondaryPosition: PlayerPosition;
      email: string;
      phone: string;
      height: number;
      weight: number;
      experience: string;
      emergencyContact: EmergencyContact;
      registrationDate: Date;
      status: PlayerStatus;
    }>,
  ): Promise<Player> {
    const player = await this.playerRepo.findById(id);
    if (!player) {
      throw new Error("Jugador no encontrado");
    }

    const requestedJerseyNumber = this.normalizeJerseyNumber(data.jerseyNumber);
    const jerseyNumber = requestedJerseyNumber !== undefined ? requestedJerseyNumber : player.jerseyNumber;
    const currentTeamId = this.getReferenceId(player.team);
    const teamId = data.team || currentTeamId;

    // Si cambia el número o equipo, verificar que no esté en uso
    if (
      jerseyNumber !== undefined &&
      jerseyNumber !== null &&
      (jerseyNumber !== player.jerseyNumber || teamId !== currentTeamId)
    ) {
      const numberExists = await this.playerRepo.existsWithJerseyNumber(jerseyNumber, teamId, player.id);
      if (numberExists) {
        throw new Error("El número de camiseta ya está en uso en este equipo");
      }
    }

    const updatedPlayer = new Player(
      data.firstName || player.firstName,
      data.lastName || player.lastName,
      data.dateOfBirth || player.dateOfBirth,
      teamId,
      jerseyNumber,
      data.position || player.position,
      data.secondaryPosition !== undefined ? data.secondaryPosition : player.secondaryPosition,
      data.registrationDate || player.registrationDate,
      data.status || player.status,
      data.email !== undefined ? data.email : player.email,
      data.phone !== undefined ? data.phone : player.phone,
      data.height !== undefined ? data.height : player.height,
      data.weight !== undefined ? data.weight : player.weight,
      data.experience !== undefined ? data.experience : player.experience,
      player.id,
      player.createdAt,
      player.updatedAt,
      data.profilePicture !== undefined ? data.profilePicture : player.profilePicture,
      data.emergencyContact !== undefined ? data.emergencyContact : player.emergencyContact,
    );

    // Validar
    const validation = updatedPlayer.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.playerRepo.update(id, updatedPlayer);
  }

  async getPlayerByEmail(email: string): Promise<Player | null> {
    return await this.playerRepo.findByEmail(email);
  }

  /**
   * Elimina un jugador
   */
  async deletePlayer(id: string): Promise<void> {
    const player = await this.playerRepo.findById(id);
    if (!player) {
      throw new Error("Jugador no encontrado");
    }

    await this.playerRepo.delete(id);
  }
}
