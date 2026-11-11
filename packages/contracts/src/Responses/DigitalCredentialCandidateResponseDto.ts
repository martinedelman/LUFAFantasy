import type { DigitalCredentialResponseDto } from "./DigitalCredentialResponseDto";

export interface DigitalCredentialCandidateResponseDto {
  id: string;
  source: "player" | "judge" | "coach" | "account" | "credential";
  fullName: string;
  detail: string | null;
  email: string | null;
  hasActiveAccount: boolean;
  credentials: DigitalCredentialResponseDto[];
}
