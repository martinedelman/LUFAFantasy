export interface AdminSystemHealthResponseDto {
  checks: Array<{
    id: string;
    label: string;
    ok: boolean;
    detail: string;
  }>;
  crons: Array<{
    path: string;
    schedule: string;
    expected: boolean;
    ok: boolean;
    label: string;
  }>;
  routes: Array<{
    path: string;
    label: string;
    ok: boolean;
    detail: string;
  }>;
}
