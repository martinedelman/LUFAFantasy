import type { TeamStatus } from "../types";
import type { Coach } from "../types";

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
  coach?: Coach;
  coaches?: Coach[];
  tournament?: string;
  players?: string[];
  status?: TeamStatus;
}
