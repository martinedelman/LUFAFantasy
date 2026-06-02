import type { TeamStatus } from "@/entities/Team";
import type { Coach } from "@/entities/Team";

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
      facebook?: string | null;
      instagram?: string | null;
      x?: string | null;
      twitter?: string | null;
    };
  };
  coach?: Coach;
  coaches?: Coach[];
  status?: TeamStatus;
  players?: string[];
}
