import type { TeamStatus } from "../types";
import type { Coach } from "../types";

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
