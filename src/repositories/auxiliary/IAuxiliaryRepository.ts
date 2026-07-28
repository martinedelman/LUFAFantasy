export type OtpPurpose = "email_verification" | "password_reset";

export interface OtpRecord {
  id: string;
  userId: string;
  email: string;
  purpose: OtpPurpose;
  tokenHash: string;
  codeHash: string;
  expiresAt: Date;
  consumedAt?: Date;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
}

export interface JudgeRecord {
  _id: string;
  firstName: string;
  lastName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IAuxiliaryRepository {
  getAdminSystemCounts(): Promise<Record<string, number>>;
  listAdminUsers(filters?: { search?: string; role?: string; isActive?: boolean }): Promise<Record<string, unknown>[]>;
  findAdminUserById(id: string): Promise<Record<string, unknown> | null>;
  updateAdminUser(id: string, role: string, isActive: boolean): Promise<Record<string, unknown> | null>;
  countOtherActiveAdmins(excludeUserId: string): Promise<number>;

  consumeOpenOtps(userId: string, purpose: OtpPurpose, consumedAt: Date): Promise<void>;
  createOtp(data: Omit<OtpRecord, "id" | "createdAt" | "consumedAt">): Promise<void>;
  findOpenOtpByToken(purpose: OtpPurpose, tokenHash: string): Promise<OtpRecord | null>;
  findLatestOpenOtpByEmail(email: string, purpose: OtpPurpose): Promise<OtpRecord | null>;
  incrementOtpAttempts(id: string): Promise<void>;
  consumeOtp(id: string, consumedAt: Date): Promise<void>;
  deleteExpiredOtps(now: Date): Promise<void>;

  findJudgesByIds(ids: string[]): Promise<JudgeRecord[]>;
  listJudges(): Promise<JudgeRecord[]>;
  findJudgeByNormalizedName(firstName: string, lastName: string): Promise<JudgeRecord | null>;
  createJudge(firstName: string, lastName: string): Promise<JudgeRecord>;

  findImportSourceKeys(sourceKeys: string[]): Promise<string[]>;
  createImportMigrations(rows: Array<Record<string, unknown>>): Promise<void>;

  findGameEventSnapshot(gameId: string, eventId: string): Promise<Record<string, unknown> | null>;
  createGameEventCorrection(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  listPendingGameEventCorrections(): Promise<Record<string, unknown>[]>;
  findPendingGameEventCorrection(id: string): Promise<Record<string, unknown> | null>;
  reviewGameEventCorrection(
    id: string,
    status: "approved" | "rejected",
    reviewedById: string,
    reviewedAt: Date,
    reviewNote?: string,
  ): Promise<boolean>;

  getSiteSettings(): Promise<Record<string, unknown> | null>;
  upsertSiteSettings(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  createAuditLog(data: Record<string, unknown>): Promise<void>;
  listAuditLogs(filters?: Record<string, string>): Promise<Record<string, unknown>[]>;
  createFlagInterest(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  listFlagInterests(filters?: { interestType?: string; playerRegistrationsOnly?: boolean }): Promise<Record<string, unknown>[]>;

  listPlayerStatistics(
    filters: { tournament?: string; division?: string; player?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }>;
  listTeamStatistics(
    filters: { tournament?: string; division?: string; team?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }>;
  upsertTeamStatistics(data: Record<string, unknown>): Promise<Record<string, unknown>>;
}
