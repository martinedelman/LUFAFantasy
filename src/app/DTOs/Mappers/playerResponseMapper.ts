import type { Player } from "@/entities/Player";
import type { PlayerResponseDto, PlayerSummaryResponseDto } from "../Responses";

export function toPlayerResponseDto(player: Player): PlayerResponseDto {
  return {
    _id: player.id,
    firstName: player.firstName,
    lastName: player.lastName,
    profilePicture: player.profilePicture,
    email: player.email,
    phone: player.phone,
    dateOfBirth: player.dateOfBirth.toISOString(),
    team: player.team,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    secondaryPosition: player.secondaryPosition,
    height: player.height,
    weight: player.weight,
    experience: player.experience,
    emergencyContact: player.emergencyContact,
    registrationDate: player.registrationDate.toISOString(),
    status: player.status,
    createdAt: player.createdAt?.toISOString(),
    updatedAt: player.updatedAt?.toISOString(),
  };
}

export function toPlayerSummaryResponseDto(player: Player): PlayerSummaryResponseDto {
  return {
    _id: player.id ?? "",
    firstName: player.firstName,
    lastName: player.lastName,
    jerseyNumber: player.jerseyNumber,
    position: player.position,
    secondaryPosition: player.secondaryPosition,
    status: player.status,
  };
}
