import { Division, DivisionCategory } from "../Division";

/**
 * Factory para crear instancias de Division
 */
export class DivisionFactory {
  /**
   * Crea una entidad Division desde un documento de base de datos
   */
  static fromDatabase(doc: any): Division {
    // Extraer IDs de teams (pueden venir poblados o como ObjectIds)
    const teamIds =
      doc.teams?.map((t: any) => {
        if (t && typeof t === "object" && "_id" in t) {
          // Team poblado - extraer el _id
          return t._id.toString();
        }
        // ObjectId simple
        return t.toString ? t.toString() : t;
      }) || [];

    return new Division(
      doc.name,
      doc.category as DivisionCategory,
      teamIds,
      doc.ageGroup,
      doc.tournament?.toString() || doc.tournament,
      doc.maxTeams,
      doc._id?.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad Division a formato de persistencia
   */
  static toPersistence(division: Division): any {
    return {
      _id: division.id,
      name: division.name,
      category: division.category,
      ageGroup: division.ageGroup,
      tournament: division.tournament,
      teams: division.teams,
      maxTeams: division.maxTeams,
      createdAt: division.createdAt,
      updatedAt: division.updatedAt,
    };
  }

  /**
   * Crea una entidad Division desde un request de API
   */
  static fromApiRequest(data: any): Division {
    return new Division(
      data.name,
      data.category as DivisionCategory,
      data.teams || [],
      data.ageGroup,
      data.tournament,
      data.maxTeams,
    );
  }

  /**
   * Convierte una entidad Division a formato de respuesta API
   */
  static toApiResponse(division: Division): any {
    return {
      _id: division.id,
      name: division.name,
      category: division.category,
      ageGroup: division.ageGroup,
      tournament: division.tournament,
      teams: division.teams,
      maxTeams: division.maxTeams,
      createdAt: division.createdAt?.toISOString(),
      updatedAt: division.updatedAt?.toISOString(),
    };
  }
}
