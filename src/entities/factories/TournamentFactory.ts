import { Tournament, TournamentStatus, TournamentFormat } from "../Tournament";

/**
 * Factory para crear instancias de Tournament
 */
export class TournamentFactory {
  /**
   * Crea una entidad Tournament desde un documento de base de datos
   */
  static fromDatabase(doc: any): Tournament {
    return new Tournament(
      doc.name,
      doc.season,
      doc.year,
      new Date(doc.startDate),
      new Date(doc.endDate),
      doc.status as TournamentStatus,
      doc.format as TournamentFormat,
      doc.divisions?.map((d: any) => {
        // Si es un objeto poblado, extraer su _id
        if (d && typeof d === "object" && d._id) {
          return d._id.toString();
        }
        // Si ya es un string o ObjectId, convertir a string
        return d.toString ? d.toString() : d;
      }) || [],
      doc.description,
      doc.registrationDeadline ? new Date(doc.registrationDeadline) : undefined,
      doc.rules,
      doc.prizes,
      doc._id?.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad Tournament a formato de persistencia
   */
  static toPersistence(tournament: Tournament): any {
    return {
      _id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      season: tournament.season,
      year: tournament.year,
      startDate: tournament.startDate,
      endDate: tournament.endDate,
      registrationDeadline: tournament.registrationDeadline,
      status: tournament.status,
      format: tournament.format,
      divisions: tournament.divisions,
      rules: tournament.rules,
      prizes: tournament.prizes,
      createdAt: tournament.createdAt,
      updatedAt: tournament.updatedAt,
    };
  }

  /**
   * Crea una entidad Tournament desde un request de API
   */
  static fromApiRequest(data: any): Tournament {
    return new Tournament(
      data.name,
      data.season,
      data.year,
      new Date(data.startDate),
      new Date(data.endDate),
      data.status || "upcoming",
      data.format || "league",
      data.divisions || [],
      data.description,
      data.registrationDeadline ? new Date(data.registrationDeadline) : undefined,
      data.rules,
      data.prizes,
    );
  }

  /**
   * Convierte una entidad Tournament a formato de respuesta API
   */
  static toApiResponse(tournament: Tournament): any {
    return {
      _id: tournament.id,
      name: tournament.name,
      description: tournament.description,
      season: tournament.season,
      year: tournament.year,
      startDate: tournament.startDate.toISOString(),
      endDate: tournament.endDate.toISOString(),
      registrationDeadline: tournament.registrationDeadline?.toISOString(),
      status: tournament.status,
      format: tournament.format,
      divisions: tournament.divisions,
      rules: tournament.rules,
      prizes: tournament.prizes,
      createdAt: tournament.createdAt?.toISOString(),
      updatedAt: tournament.updatedAt?.toISOString(),
    };
  }
}
