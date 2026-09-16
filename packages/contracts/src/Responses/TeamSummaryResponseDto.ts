export interface TeamSummaryResponseDto {
  _id: string;
  name: string;
  shortName?: string;
  logo?: string;
  backgroundImage?: string;
  colors: {
    primary: string;
    secondary?: string;
  };
  coaches?: Array<{
    name: string;
    email?: string;
    phone?: string;
    experience?: string;
    certifications?: string[];
  }>;
}
