import type { Team } from "@/entities/Team";
import type { TeamResponseDto, TeamSummaryResponseDto } from "../Responses";

export function toTeamResponseDto(team: Team): TeamResponseDto {
  const coaches = team.coaches && team.coaches.length > 0 ? team.coaches : team.coach ? [team.coach] : undefined;

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
    coach: coaches?.[0],
    coaches,
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
  const coaches = team.coaches && team.coaches.length > 0 ? team.coaches : team.coach ? [team.coach] : undefined;

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
    coaches,
  };
}
