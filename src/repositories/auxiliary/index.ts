import { getDatabaseProvider } from "@/lib/databaseProvider";
import type { IAuxiliaryRepository } from "./IAuxiliaryRepository";
import { MongoAuxiliaryRepository } from "./MongoAuxiliaryRepository";
import { PrismaAuxiliaryRepository } from "./PrismaAuxiliaryRepository";

let repository: IAuxiliaryRepository | undefined;
let provider: string | undefined;

export function getAuxiliaryRepository(): IAuxiliaryRepository {
  const nextProvider = getDatabaseProvider();
  if (!repository || provider !== nextProvider) {
    provider = nextProvider;
    repository =
      nextProvider === "postgres" ? new PrismaAuxiliaryRepository() : new MongoAuxiliaryRepository();
  }
  return repository;
}

export type { IAuxiliaryRepository, JudgeRecord, OtpPurpose, OtpRecord } from "./IAuxiliaryRepository";
