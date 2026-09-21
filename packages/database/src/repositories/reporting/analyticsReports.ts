import { getDatabaseProvider } from "@lufa/database/databaseProvider";
import { MongoAnalyticsReportRepository } from "./MongoAnalyticsReportRepository";
import { PrismaAnalyticsReportRepository } from "./PrismaAnalyticsReportRepository";
import type { AnalyticsReportRepository } from "./AnalyticsReportRepository";

let repository: AnalyticsReportRepository | undefined;
let provider: string | undefined;
export function getAnalyticsReportRepository(): AnalyticsReportRepository {
  const next = getDatabaseProvider();
  if (!repository || provider !== next) { provider = next; repository = next === "postgres" ? new PrismaAnalyticsReportRepository() : new MongoAnalyticsReportRepository(); }
  return repository;
}
