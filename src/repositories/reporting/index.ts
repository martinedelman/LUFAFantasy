import { getDatabaseProvider } from "@/lib/databaseProvider";
import type { IReportingRepository } from "./IReportingRepository";
import { MongoReportingRepository } from "./MongoReportingRepository";
import { PrismaReportingRepository } from "./PrismaReportingRepository";

let repository: IReportingRepository | undefined;
let provider: string | undefined;

export function getReportingRepository(): IReportingRepository {
  const nextProvider = getDatabaseProvider();
  if (!repository || provider !== nextProvider) {
    provider = nextProvider;
    repository =
      nextProvider === "postgres" ? new PrismaReportingRepository() : new MongoReportingRepository();
  }
  return repository;
}

export type { IReportingRepository } from "./IReportingRepository";
