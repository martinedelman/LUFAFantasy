import { Player, PlayerPosition, PlayerStatus } from "../Player";

/**
 * Factory para crear instancias de Player
 */
export class PlayerFactory {
  /**
   * Crea una entidad Player desde un documento de base de datos
   */
  static fromDatabase(doc: any): Player {
    return new Player(
      doc.firstName,
      doc.lastName,
      new Date(doc.dateOfBirth),
      doc.team?.toString() || doc.team,
      doc.jerseyNumber,
      doc.position as PlayerPosition,
      new Date(doc.registrationDate),
      doc.status as PlayerStatus,
      doc.email,
      doc.phone,
      doc.height,
      doc.weight,
      doc.experience,
      doc._id?.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad Player a formato de persistencia
   */
  static toPersistence(player: Player): any {
    return {
      _id: player.id,
      firstName: player.firstName,
      lastName: player.lastName,
      email: player.email,
      phone: player.phone,
      dateOfBirth: player.dateOfBirth,
      team: player.team,
      jerseyNumber: player.jerseyNumber,
      position: player.position,
      height: player.height,
      weight: player.weight,
      experience: player.experience,
      registrationDate: player.registrationDate,
      status: player.status,
      createdAt: player.createdAt,
      updatedAt: player.updatedAt,
    };
  }

  /**
   * Crea una entidad Player desde un request de API
   */
  static fromApiRequest(data: any): Player {
    return new Player(
      data.firstName,
      data.lastName,
      new Date(data.dateOfBirth),
      data.team,
      data.jerseyNumber,
      data.position as PlayerPosition,
      data.registrationDate ? new Date(data.registrationDate) : new Date(),
      data.status || "active",
      data.email,
      data.phone,
      data.height,
      data.weight,
      data.experience,
    );
  }
}
