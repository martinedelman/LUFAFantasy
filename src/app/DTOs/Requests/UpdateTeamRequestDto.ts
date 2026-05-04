import type { TeamStatus } from "@/entities/Team";

export interface UpdateTeamRequestDto {
  name?: string;
  colors?: {
    primary: string;
    secondary?: string;
  };
  shortName?: string;
  logo?: string;
  backgroundImage?: string;
  contact?: {
    email?: string;
    phone?: string;
    address?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  status?: TeamStatus;
  players?: string[];
}
