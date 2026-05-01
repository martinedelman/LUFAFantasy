export interface TeamSummaryResponseDto {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  colors: {
    primary: string;
    secondary?: string;
  };
}
