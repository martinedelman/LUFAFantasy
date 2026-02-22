import { Standing } from "../Standing";

/**
 * Factory para crear instancias de Standing
 */
export class StandingFactory {
  /**
   * Crea una entidad Standing desde un documento de base de datos
   */
  static fromDatabase(doc: any): Standing {
    return new Standing(
      doc.division?.toString() || doc.division,
      doc.team?.toString() || doc.team,
      doc.tournament?.toString() || doc.tournament,
      doc.wins || 0,
      doc.losses || 0,
      doc.ties || 0,
      doc.pointsFor || 0,
      doc.pointsAgainst || 0,
      doc.position || 0,
      doc.streak,
      doc.lastFiveGames,
      doc._id?.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad Standing a formato de persistencia
   */
  static toPersistence(standing: Standing): any {
    return {
      _id: standing.id,
      division: standing.division,
      team: standing.team,
      tournament: standing.tournament,
      position: standing.position,
      wins: standing.wins,
      losses: standing.losses,
      ties: standing.ties,
      pointsFor: standing.pointsFor,
      pointsAgainst: standing.pointsAgainst,
      pointsDifferential: standing.pointsDifferential,
      percentage: standing.percentage,
      streak: standing.streak,
      lastFiveGames: standing.lastFiveGames,
      createdAt: standing.createdAt,
      updatedAt: standing.updatedAt,
    };
  }

  /**
   * Crea una entidad Standing desde un request de API
   */
  static fromApiRequest(data: any): Standing {
    return new Standing(
      data.division,
      data.team,
      data.tournament,
      data.wins || 0,
      data.losses || 0,
      data.ties || 0,
      data.pointsFor || 0,
      data.pointsAgainst || 0,
      data.position || 0,
      data.streak,
      data.lastFiveGames,
    );
  }
}
