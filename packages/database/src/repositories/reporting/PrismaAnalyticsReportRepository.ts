import { getPrismaClient } from "@lufa/database/prisma";
import type { AnalyticsReport } from "@lufa/database/generated/prisma/client";
import type { AnalyticsReportDto } from "@lufa/contracts";
import type { AnalyticsReportRepository } from "./AnalyticsReportRepository";
import { plainJson } from "../prisma/mappers";

const dto = (row: AnalyticsReport): AnalyticsReportDto => ({
  id: row.id, ownerId: row.ownerId, name: row.name, description: row.description || "", scope: row.scope as AnalyticsReportDto["scope"],
  filters: (row.filters || {}) as unknown as AnalyticsReportDto["filters"],
  widgets: (row.widgets || []) as unknown as AnalyticsReportDto["widgets"],
  layouts: (row.layouts || {}) as unknown as AnalyticsReportDto["layouts"],
  version: row.version,
  createdAt: row.createdAt?.toISOString(), updatedAt: row.updatedAt?.toISOString(),
});

export class PrismaAnalyticsReportRepository implements AnalyticsReportRepository {
  private get db() { return getPrismaClient(); }
  private get reports() { return this.db.analyticsReport; }
  async list(ownerId: string, includeTemplates: boolean) {
    const rows = await this.reports.findMany({ where: includeTemplates ? { OR: [{ ownerId }, { scope: "template" }] } : { ownerId }, orderBy: { updatedAt: "desc" } });
    return rows.map(dto);
  }
  async find(id: string) { const row = await this.reports.findUnique({ where: { id } }); return row ? dto(row) : null; }
  async create(report: Omit<AnalyticsReportDto, "id" | "version" | "createdAt" | "updatedAt">) {
    return dto(await this.reports.create({ data: { ownerId: report.ownerId!, name: report.name, description: report.description, scope: report.scope === "template" ? "template" : "personal", filters: plainJson(report.filters), widgets: plainJson(report.widgets), layouts: plainJson(report.layouts) } }));
  }
  async update(report: AnalyticsReportDto, expectedVersion: number) {
    const updated = await this.reports.updateMany({ where: { id: report.id, version: expectedVersion }, data: { name: report.name, description: report.description, scope: report.scope === "template" ? "template" : "personal", filters: plainJson(report.filters), widgets: plainJson(report.widgets), layouts: plainJson(report.layouts), version: { increment: 1 } } });
    return updated.count ? this.find(report.id) : null;
  }
  async delete(id: string, expectedVersion: number) { return (await this.reports.deleteMany({ where: { id, version: expectedVersion } })).count > 0; }
}
