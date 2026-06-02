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
      facebook?: string | null;
      instagram?: string | null;
      x?: string | null;
      twitter?: string | null;
    };
  };
  shortName?: string;
  logo?: string;
  backgroundImage?: string;
  tournament?: string;
  players?: string[];
  status?: TeamStatus;
}
