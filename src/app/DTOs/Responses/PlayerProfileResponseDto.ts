import type { PlayerResponseDto } from "./PlayerResponseDto";
import type { TeamSummaryResponseDto } from "./TeamSummaryResponseDto";

interface DivisionSummaryResponseDto {
  _id: string;
  name: string;
  category: string;
}

export interface PlayerProfileResponseDto extends Omit<PlayerResponseDto, "team"> {
  _id: string;
  team: TeamSummaryResponseDto & {
    division: DivisionSummaryResponseDto;
  };
}
