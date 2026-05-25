import type { TeamStatus } from "@/entities/Team";
import type { Coach } from "@/entities/Team";

export interface TeamResponseDto {
  _id?: string;
  name: string;
  shortName?: string;
  logo?: string;
  backgroundImage?: string;
  colors: {
    primary: string;
    secondary?: string;
  };
  division: string;
  tournament?: string;
  players: string[];
  coach?: Coach;
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
  registrationDate: string;
  status: TeamStatus;
  createdAt?: string;
  updatedAt?: string;
}
