export interface AdminPlayerImportDryRunResponseDto {
  created: number;
  updated: number;
  skipped: number;
  alreadyMigrated: number;
  errors: Array<{
    rowNumber: number;
    email?: string;
    message: string;
  }>;
  dryRun: boolean;
}
