import { EmergencyContact, Player, PlayerPosition, PlayerStatus } from "@lufa/sports/entities/Player";
import type { IPlayerRepository, ITeamRepository, PlayerModalityProfile } from "@lufa/sports/ports";
import { DEFAULT_MODALITY, type Modality } from "@lufa/sports/entities/Modality";
import { MODALITY_RULES } from "@lufa/contracts/game-events";

/**
 * Servicio de gestión de jugadores
 */
export class PlayerService {
  constructor(
    private readonly playerRepo: IPlayerRepository,
    private readonly teamRepo: ITeamRepository,
  ) {}

  private sortPlayers(players: Player[]): Player[] {
    return [...players].sort((firstPlayer, secondPlayer) => {
      const lastNameComparison = firstPlayer.lastName.localeCompare(secondPlayer.lastName, "es", {
        sensitivity: "base",
      });

      if (lastNameComparison !== 0) {
        return lastNameComparison;
      }

      const firstNameComparison = firstPlayer.firstName.localeCompare(secondPlayer.firstName, "es", {
        sensitivity: "base",
      });

      if (firstNameComparison !== 0) {
        return firstNameComparison;
      }

      const firstJerseyNumber = firstPlayer.jerseyNumber ?? Number.MAX_SAFE_INTEGER;
      const secondJerseyNumber = secondPlayer.jerseyNumber ?? Number.MAX_SAFE_INTEGER;

      return firstJerseyNumber - secondJerseyNumber;
    });
  }

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

    if (value === null) {
      return null;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return null;
    }

    const parsedValue = typeof value === "number" ? value : Number(value);

    if (Number.isNaN(parsedValue)) {
      throw new Error("Número de camiseta inválido");
    }

    if (!Number.isInteger(parsedValue) || parsedValue < 0 || parsedValue > 99) {
      throw new Error("El número de camiseta debe estar entre 0 y 99");
    }

    return parsedValue;
  }

  private normalizeSecondaryPosition(value: unknown): PlayerPosition | undefined {
    if (value === undefined || value === null) {
      return undefined;
    }

    if (typeof value === "string" && value.trim().length === 0) {
      return undefined;
    }

    return value as PlayerPosition;
  }

  private assertPositionForModality(modality: Modality, ...positions: Array<PlayerPosition | null | undefined>) {
    const allowed: readonly string[] = MODALITY_RULES[modality].positions;
    for (const position of positions) {
      if (position && !allowed.includes(position)) {
        throw new Error(`La posición ${position} no existe en ${modality}`);
      }
    }
  }

  /**
   * Crea un nuevo jugador. `modality` es la del sitio desde el que se carga
   * (por defecto flag): ahí queda guardado su número y posición.
   */
  async createPlayer(data: {
    firstName: string;
    lastName: string;
    profilePicture?: string;
    dateOfBirth: Date;
    team: string;
    jerseyNumber?: number | null;
    position: PlayerPosition;
    secondaryPosition?: PlayerPosition | null | "";
    email?: string;
    phone?: string;
    height?: number;
    weight?: number;
    experience?: string;
    emergencyContact?: EmergencyContact;
    status?: PlayerStatus;
    registrationDate?: Date;
  }, modality: Modality = DEFAULT_MODALITY): Promise<Player> {
    const jerseyNumber = this.normalizeJerseyNumber(data.jerseyNumber);
    const secondaryPosition = this.normalizeSecondaryPosition(data.secondaryPosition);
    this.assertPositionForModality(modality, data.position, secondaryPosition);

    // Verificar que el equipo existe
    const team = await this.teamRepo.findById(data.team);
    if (!team) {
      throw new Error("Equipo no encontrado");
    }

    // Verificar que el número de camiseta no esté en uso en el equipo
    if (jerseyNumber !== undefined && jerseyNumber !== null) {
      const numberExists = await this.playerRepo.isJerseyTaken(jerseyNumber, { modality, teamId: data.team });
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
      secondaryPosition,
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

    return await this.playerRepo.createWithProfile(player, {
      modality,
      jerseyNumber: jerseyNumber ?? null,
      position: data.position,
      secondaryPosition: secondaryPosition ?? null,
    });
  }

  /**
   * Obtiene un jugador por ID. Con modalidad, número y posiciones son los de esa modalidad.
   */
  async getPlayerById(id: string, modality?: Modality): Promise<Player | null> {
    return await this.playerRepo.findById(id, modality);
  }

  async getHomeModality(id: string): Promise<Modality> {
    return await this.playerRepo.getHomeModality(id);
  }

  async listModalityProfiles(id: string): Promise<PlayerModalityProfile[]> {
    return await this.playerRepo.listModalityProfiles(id);
  }

  /**
   * Lista jugadores con filtros
   */
  async listPlayers(filters?: {
    team?: string;
    position?: PlayerPosition;
    status?: PlayerStatus;
    search?: string;
    modality?: Modality;
  }): Promise<Player[]> {
    if (!filters) {
      const players = await this.playerRepo.findAll();
      return this.sortPlayers(players);
    }

    const { search, team, position, status, modality } = filters;

    if (search && team) {
      // Resolve the roster (primary team + memberships) first, then match the name.
      const needle = search.trim().toLowerCase();
      const roster = await this.playerRepo.findAll({
        team,
        ...(position ? { position } : {}),
        ...(status ? { status } : {}),
        ...(modality ? { modality } : {}),
      });
      return this.sortPlayers(
        roster.filter((player) =>
          [player.firstName, player.lastName].some((name) => name?.toLowerCase().includes(needle)),
        ),
      );
    }

    if (search) {
      const searchResults = await this.playerRepo.searchByName(search, modality);
      const filteredPlayers = searchResults.filter((player) => {
        if (team && String((player.team as unknown as { _id?: string })?._id || player.team) !== team) {
          return false;
        }

        if (position && player.position !== position && player.secondaryPosition !== position) {
          return false;
        }

        if (status && player.status !== status) {
          return false;
        }

        return true;
      });

      return this.sortPlayers(filteredPlayers);
    }

    const queryFilters: { team?: string; status?: PlayerStatus; position?: PlayerPosition; modality?: Modality } = {};
    if (team) queryFilters.team = team;
    if (position) queryFilters.position = position;
    if (status) queryFilters.status = status;
    if (modality) queryFilters.modality = modality;

    const players = await this.playerRepo.findAll(queryFilters);
    return this.sortPlayers(players);
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
      secondaryPosition: PlayerPosition | null | "";
      email: string;
      phone: string;
      height: number;
      weight: number;
      experience: string;
      emergencyContact: EmergencyContact;
      registrationDate: Date;
      status: PlayerStatus;
    }>,
    modality: Modality = DEFAULT_MODALITY,
  ): Promise<Player> {
    const player = await this.playerRepo.findById(id);
    if (!player) {
      throw new Error("Jugador no encontrado");
    }

    // The base record mirrors the primary team's modality; other modalities only touch their profile.
    const home = await this.playerRepo.getHomeModality(id);
    const isHome = modality === home;
    const current = isHome ? player : (await this.playerRepo.findById(id, modality)) || player;

    const requestedJerseyNumber = this.normalizeJerseyNumber(data.jerseyNumber);
    const secondaryPosition = this.normalizeSecondaryPosition(data.secondaryPosition);
    const jerseyNumber = requestedJerseyNumber !== undefined ? requestedJerseyNumber : current.jerseyNumber;
    const position = data.position || current.position;
    const nextSecondaryPosition = data.secondaryPosition !== undefined ? secondaryPosition : current.secondaryPosition;
    // Outside the home modality and without a profile, positions are inherited from the home one
    // (e.g. a tackle player's DT read from flag): validate what will be stored. Otherwise only
    // validate changes, so legacy positions don't block unrelated edits.
    const inherited =
      !isHome && !(await this.playerRepo.listModalityProfiles(id)).some((profile) => profile.modality === modality);
    if (inherited) {
      this.assertPositionForModality(modality, position, nextSecondaryPosition);
    } else {
      if (data.position && data.position !== current.position) this.assertPositionForModality(modality, data.position);
      if (data.secondaryPosition !== undefined && secondaryPosition !== current.secondaryPosition) {
        this.assertPositionForModality(modality, secondaryPosition);
      }
    }
    const currentTeamId = this.getReferenceId(player.team);
    const teamId = data.team || currentTeamId;

    if (teamId !== currentTeamId) {
      const team = await this.teamRepo.findById(teamId);
      if (!team) {
        throw new Error("Equipo no encontrado");
      }
    }

    // Si cambia el número o equipo, verificar que no esté en uso
    if (
      jerseyNumber !== undefined &&
      jerseyNumber !== null &&
      (jerseyNumber !== current.jerseyNumber || teamId !== currentTeamId)
    ) {
      const numberExists = await this.playerRepo.isJerseyTaken(jerseyNumber, {
        modality,
        playerId: id,
        ...(teamId !== currentTeamId ? { teamId } : {}),
      });
      if (numberExists) {
        throw new Error("El número de camiseta ya está en uso en este equipo");
      }
    }

    const updatedPlayer = new Player(
      data.firstName || player.firstName,
      data.lastName || player.lastName,
      data.dateOfBirth || player.dateOfBirth,
      teamId,
      isHome ? jerseyNumber : player.jerseyNumber,
      isHome ? position : player.position,
      isHome ? nextSecondaryPosition : player.secondaryPosition,
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

    return await this.playerRepo.updateWithProfile(id, updatedPlayer, {
      modality,
      jerseyNumber: jerseyNumber ?? null,
      position,
      secondaryPosition: nextSecondaryPosition ?? null,
    });
  }

  async getPlayerByEmail(email: string, modality?: Modality): Promise<Player | null> {
    return await this.playerRepo.findByEmail(email, modality);
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
