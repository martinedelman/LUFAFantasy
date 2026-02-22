import { Team, TeamStatus } from "../Team";
import { Colors } from "../valueObjects/Colors";
import { ContactInfo } from "../valueObjects/ContactInfo";

/**
 * Factory para crear instancias de Team
 */
export class TeamFactory {
  /**
   * Crea una entidad Team desde un documento de base de datos
   */
  static fromDatabase(doc: any): Team {
    const colors = new Colors(doc.colors.primary, doc.colors.secondary);

    const contact = new ContactInfo({
      email: doc.contact?.email,
      phone: doc.contact?.phone,
      address: doc.contact?.address,
      socialMedia: doc.contact?.socialMedia,
    });

    return new Team(
      doc.name,
      colors,
      doc.division?.toString() || doc.division,
      contact,
      new Date(doc.registrationDate),
      doc.status as TeamStatus,
      doc.players?.map((p: any) => (p.toString ? p.toString() : p)) || [],
      doc.shortName,
      doc.logo,
      doc.tournament?.toString() || doc.tournament,
      doc._id?.toString(),
      doc.createdAt,
      doc.updatedAt,
    );
  }

  /**
   * Convierte una entidad Team a formato de persistencia
   */
  static toPersistence(team: Team): any {
    return {
      _id: team.id,
      name: team.name,
      shortName: team.shortName,
      logo: team.logo,
      colors: {
        primary: team.colors.primary,
        secondary: team.colors.secondary,
      },
      division: team.division,
      tournament: team.tournament,
      players: team.players,
      contact: {
        email: team.contact.email,
        phone: team.contact.phone,
        address: team.contact.address,
        socialMedia: team.contact.socialMedia,
      },
      registrationDate: team.registrationDate,
      status: team.status,
      createdAt: team.createdAt,
      updatedAt: team.updatedAt,
    };
  }

  /**
   * Crea una entidad Team desde un request de API
   */
  static fromApiRequest(data: any): Team {
    const colors = new Colors(data.colors.primary, data.colors.secondary);

    const contact = new ContactInfo({
      email: data.contact?.email,
      phone: data.contact?.phone,
      address: data.contact?.address,
      socialMedia: data.contact?.socialMedia,
    });

    return new Team(
      data.name,
      colors,
      data.division,
      contact,
      data.registrationDate ? new Date(data.registrationDate) : new Date(),
      data.status || "active",
      data.players || [],
      data.shortName,
      data.logo,
      data.tournament,
    );
  }

  /**
   * Convierte una entidad Team a formato de respuesta API
   */
  static toApiResponse(team: Team): any {
    return {
      _id: team.id,
      name: team.name,
      shortName: team.shortName,
      logo: team.logo,
      colors: {
        primary: team.colors.primary,
        secondary: team.colors.secondary,
      },
      division: team.division,
      tournament: team.tournament,
      players: team.players,
      contact: {
        email: team.contact.email,
        phone: team.contact.phone,
        address: team.contact.address,
        socialMedia: team.contact.socialMedia,
      },
      registrationDate: team.registrationDate.toISOString(),
      status: team.status,
      createdAt: team.createdAt?.toISOString(),
      updatedAt: team.updatedAt?.toISOString(),
    };
  }
}
