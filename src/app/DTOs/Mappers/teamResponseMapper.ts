import type { Team } from "@/entities/Team";
import type { TeamResponseDto, TeamSummaryResponseDto } from "../Responses";

export function toTeamResponseDto(team: Team): TeamResponseDto {
  return {
    _id: team.id,
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    backgroundImage: team.backgroundImage,
    colors: {
      primary: team.colors.primary,
      secondary: team.colors.secondary,
    },
    division: team.division,
    tournament: team.tournament,
    players: team.players,
    coach: team.coach,
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

export function toTeamSummaryResponseDto(team: Team): TeamSummaryResponseDto {
  return {
    _id: team.id ?? "",
    name: team.name,
    shortName: team.shortName,
    logo: team.logo,
    backgroundImage: team.backgroundImage,
    colors: {
      primary: team.colors.primary,
      secondary: team.colors.secondary,
    },
  };
}
