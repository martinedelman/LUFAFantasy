export type PublicHealthStatus = "ok" | "degraded";

export interface PublicHealthComponentDto {
  id: "app" | "configuration" | "database" | "scheduled-jobs";
  status: PublicHealthStatus;
  detail: string;
}

export interface PublicHealthResponseDto {
  status: PublicHealthStatus;
  service: string;
  timestamp: string;
  uptimeSeconds: number;
  environment: string;
  version: string;
  components: PublicHealthComponentDto[];
}
