import connectToDatabase from "@lufa/database/mongodb";
import { AnalyticsReportModel } from "@lufa/database/models";
import type { AnalyticsReportDto } from "@lufa/contracts";
import mongoose from "mongoose";
import type { AnalyticsReportRepository } from "./AnalyticsReportRepository";

const dto = (row: any): AnalyticsReportDto => ({
  id: String(row._id), ownerId: String(row.owner), name: row.name, description: row.description || "", scope: row.scope,
  filters: row.filters || {}, widgets: row.widgets || [], layouts: row.layouts || {}, version: row.version,
  createdAt: row.createdAt?.toISOString(), updatedAt: row.updatedAt?.toISOString(),
});

export class MongoAnalyticsReportRepository implements AnalyticsReportRepository {
  async list(ownerId: string, includeTemplates: boolean) {
    await connectToDatabase(); const owner = new mongoose.Types.ObjectId(ownerId);
    return (await AnalyticsReportModel.find(includeTemplates ? { $or: [{ owner }, { scope: "template" }] } : { owner }).sort({ updatedAt: -1 }).lean()).map(dto);
  }
  async find(id: string) { await connectToDatabase(); const row = await AnalyticsReportModel.findById(id).lean(); return row ? dto(row) : null; }
  async create(report: Omit<AnalyticsReportDto, "id" | "version" | "createdAt" | "updatedAt">) {
    await connectToDatabase(); return dto((await AnalyticsReportModel.create({ owner: new mongoose.Types.ObjectId(report.ownerId!), name: report.name, description: report.description, scope: report.scope === "template" ? "template" : "personal", filters: report.filters, widgets: report.widgets, layouts: report.layouts })).toObject());
  }
  async update(report: AnalyticsReportDto, expectedVersion: number) {
    await connectToDatabase(); const row = await AnalyticsReportModel.findOneAndUpdate({ _id: report.id, version: expectedVersion }, { $set: { name: report.name, description: report.description, scope: report.scope === "template" ? "template" : "personal", filters: report.filters, widgets: report.widgets, layouts: report.layouts }, $inc: { version: 1 } }, { new: true }).lean(); return row ? dto(row) : null;
  }
  async delete(id: string, expectedVersion: number) { await connectToDatabase(); return (await AnalyticsReportModel.deleteOne({ _id: id, version: expectedVersion })).deletedCount > 0; }
}
