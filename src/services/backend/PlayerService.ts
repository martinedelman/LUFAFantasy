import { Player, PlayerPosition, PlayerStatus } from "../../entities/Player";
import RepositoryContainer from "../../repositories";

/**
 * Servicio de gestión de jugadores
 */
export class PlayerService {
  private playerRepo = RepositoryContainer.getPlayerRepository();
  private teamRepo = RepositoryContainer.getTeamRepository();

  /**
   * Crea un nuevo jugador
   */
  async createPlayer(data: {
    firstName: string;
    lastName: string;
    dateOfBirth: Date;
    team: string;
    jerseyNumber: number;
    position: PlayerPosition;
    email?: string;
    phone?: string;
    height?: number;
    weight?: number;
    experience?: string;
    status?: PlayerStatus;
    registrationDate?: Date;
  }): Promise<Player> {
    // Verificar que el equipo existe
    const team = await this.teamRepo.findById(data.team);
    if (!team) {
      throw new Error("Equipo no encontrado");
    }

    // Verificar que el número de camiseta no esté en uso en el equipo
    const numberExists = await this.playerRepo.existsWithJerseyNumber(data.jerseyNumber, data.team);
    if (numberExists) {
      throw new Error("El número de camiseta ya está en uso en este equipo");
    }

    const player = new Player(
      data.firstName,
      data.lastName,
      data.dateOfBirth,
      data.team,
      data.jerseyNumber,
      data.position,
      data.registrationDate || new Date(),
      data.status || "active",
      data.email,
      data.phone,
      data.height,
      data.weight,
      data.experience,
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
  async listPlayers(filters?: { team?: string; position?: PlayerPosition; status?: PlayerStatus }): Promise<Player[]> {
    if (filters?.team) {
      return await this.playerRepo.findByTeam(filters.team);
    }

    if (filters?.position) {
      return await this.playerRepo.findByPosition(filters.position);
    }

    if (filters?.status === "active") {
      return await this.playerRepo.findActivePlayers();
    }

    return await this.playerRepo.findAll(filters);
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
      dateOfBirth: Date;
      team: string;
      jerseyNumber: number;
      position: PlayerPosition;
      email: string;
      phone: string;
      height: number;
      weight: number;
      experience: string;
      status: PlayerStatus;
    }>,
  ): Promise<Player> {
    const player = await this.playerRepo.findById(id);
    if (!player) {
      throw new Error("Jugador no encontrado");
    }

    // Si cambia el número o equipo, verificar que no esté en uso
    if (data.jerseyNumber || data.team) {
      const jerseyNumber = data.jerseyNumber || player.jerseyNumber;
      const teamId = data.team || player.team;

      if (jerseyNumber !== player.jerseyNumber || teamId !== player.team) {
        const numberExists = await this.playerRepo.existsWithJerseyNumber(jerseyNumber, teamId);
        if (numberExists) {
          throw new Error("El número de camiseta ya está en uso en este equipo");
        }
      }
    }

    const updatedPlayer = new Player(
      data.firstName || player.firstName,
      data.lastName || player.lastName,
      data.dateOfBirth || player.dateOfBirth,
      data.team || player.team,
      data.jerseyNumber !== undefined ? data.jerseyNumber : player.jerseyNumber,
      data.position || player.position,
      player.registrationDate,
      data.status || player.status,
      data.email !== undefined ? data.email : player.email,
      data.phone !== undefined ? data.phone : player.phone,
      data.height !== undefined ? data.height : player.height,
      data.weight !== undefined ? data.weight : player.weight,
      data.experience !== undefined ? data.experience : player.experience,
      player.id,
      player.createdAt,
      player.updatedAt,
    );

    // Validar
    const validation = updatedPlayer.validate();
    if (!validation.isValid) {
      throw new Error(validation.errors.join(", "));
    }

    return await this.playerRepo.update(id, updatedPlayer);
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
