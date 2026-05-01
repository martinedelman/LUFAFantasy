import type { TeamStatus } from "@/entities/Team";

export interface CreateTeamRequestDto {
  name: string;
  colors: {
    primary: string;
    secondary?: string;
  };
  division: string;
  contact: {
    email?: string;
    phone?: string;
    address?: string;
    socialMedia?: {
      facebook?: string;
      instagram?: string;
      twitter?: string;
    };
  };
  shortName?: string;
  logo?: string;
  tournament?: string;
  players?: string[];
  status?: TeamStatus;
}
