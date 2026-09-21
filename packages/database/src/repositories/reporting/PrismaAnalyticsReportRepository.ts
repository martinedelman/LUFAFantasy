import { getPrismaClient } from "@lufa/database/prisma";
import type { AnalyticsReportDto } from "@lufa/contracts";
import type { AnalyticsReportRepository } from "./AnalyticsReportRepository";

const dto = (row: any): AnalyticsReportDto => ({
  id: row.id, ownerId: row.ownerId, name: row.name, description: row.description || "", scope: row.scope,
  filters: row.filters || {}, widgets: row.widgets || [], layouts: row.layouts || {}, version: row.version,
  createdAt: row.createdAt?.toISOString(), updatedAt: row.updatedAt?.toISOString(),
});

export class PrismaAnalyticsReportRepository implements AnalyticsReportRepository {
  private get db() { return getPrismaClient(); }
  private get reports() { return (this.db as any).analyticsReport; }
  async list(ownerId: string, includeTemplates: boolean) {
    const rows = await this.reports.findMany({ where: includeTemplates ? { OR: [{ ownerId }, { scope: "template" }] } : { ownerId }, orderBy: { updatedAt: "desc" } });
    return rows.map(dto);
  }
  async find(id: string) { const row = await this.reports.findUnique({ where: { id } }); return row ? dto(row) : null; }
  async create(report: Omit<AnalyticsReportDto, "id" | "version" | "createdAt" | "updatedAt">) {
    return dto(await this.reports.create({ data: { ownerId: report.ownerId!, name: report.name, description: report.description, scope: report.scope === "template" ? "template" : "personal", filters: report.filters as any, widgets: report.widgets as any, layouts: report.layouts as any } }));
  }
  async update(report: AnalyticsReportDto, expectedVersion: number) {
    const updated = await this.reports.updateMany({ where: { id: report.id, version: expectedVersion }, data: { name: report.name, description: report.description, scope: report.scope === "template" ? "template" : "personal", filters: report.filters as any, widgets: report.widgets as any, layouts: report.layouts as any, version: { increment: 1 } } });
    return updated.count ? this.find(report.id) : null;
  }
  async delete(id: string, expectedVersion: number) { return (await this.reports.deleteMany({ where: { id, version: expectedVersion } })).count > 0; }
}
