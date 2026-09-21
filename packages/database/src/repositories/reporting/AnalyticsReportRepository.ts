import type { AnalyticsReportDto } from "@lufa/contracts";

export interface AnalyticsReportRepository {
  list(ownerId: string, includeTemplates: boolean): Promise<AnalyticsReportDto[]>;
  find(id: string): Promise<AnalyticsReportDto | null>;
  create(report: Omit<AnalyticsReportDto, "id" | "version" | "createdAt" | "updatedAt">): Promise<AnalyticsReportDto>;
  update(report: AnalyticsReportDto, expectedVersion: number): Promise<AnalyticsReportDto | null>;
  delete(id: string, expectedVersion: number): Promise<boolean>;
}
