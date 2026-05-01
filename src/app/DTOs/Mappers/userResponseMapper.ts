import type { User } from "@/entities/User";
import type { RegisteredUserResponseDto, UserResponseDto } from "../Responses";

export function toUserResponseDto(user: User): UserResponseDto {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    isAdmin: user.isAdmin(),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

export function toRegisteredUserResponseDto(user: User): RegisteredUserResponseDto {
  return {
    _id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt?.toISOString(),
    updatedAt: user.updatedAt?.toISOString(),
  };
}
