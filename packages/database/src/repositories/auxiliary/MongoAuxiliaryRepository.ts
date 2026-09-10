/* eslint-disable @typescript-eslint/no-explicit-any */
import mongoose from "mongoose";
import connectToDatabase from "@lufa/database/mongodb";
import {
  AdminAuditLogModel,
  FlagInterestModel,
  GameEventCorrectionModel,
  GameEventModel,
  JudgeModel,
  PlayerImportMigrationModel,
  PlayerModel,
  SiteSettingsModel,
  TeamModel,
  TournamentModel,
  UserModel,
  GameModel,
  PlayerStatisticsModel,
  TeamStatisticsModel,
} from "@lufa/database/models";
import { OtpVerificationModel } from "@lufa/database/models/OtpVerification";
import type {
  IAuxiliaryRepository,
  JudgeRecord,
  OtpPurpose,
  OtpRecord,
} from "./IAuxiliaryRepository";

function id(value: unknown): string {
  if (!value) return "";
  if (typeof value === "object" && value && "_id" in value) return String((value as { _id: unknown })._id);
  return String(value);
}

function otpRecord(doc: any): OtpRecord | null {
  if (!doc) return null;
  return {
    id: id(doc._id),
    userId: id(doc.userId),
    email: doc.email,
    purpose: doc.purpose,
    tokenHash: doc.tokenHash,
    codeHash: doc.codeHash,
    expiresAt: doc.expiresAt,
    consumedAt: doc.consumedAt,
    attempts: doc.attempts,
    maxAttempts: doc.maxAttempts,
    createdAt: doc.createdAt,
  };
}

function judgeRecord(doc: any): JudgeRecord {
  return {
    _id: id(doc._id),
    firstName: doc.firstName,
    lastName: doc.lastName,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

export class MongoAuxiliaryRepository implements IAuxiliaryRepository {
  private async connect() {
    await connectToDatabase();
  }

  async getAdminSystemCounts(): Promise<Record<string, number>> {
    await this.connect();
    const values = await Promise.all([
      UserModel.countDocuments({}),
      UserModel.countDocuments({ isActive: true }),
      UserModel.countDocuments({ isActive: false }),
      UserModel.countDocuments({ role: "admin", isActive: true }),
      UserModel.countDocuments({ role: "entrenador_juveniles", isActive: true }),
      JudgeModel.countDocuments({}),
      TournamentModel.countDocuments({ status: "active" }),
      TournamentModel.countDocuments({ status: "upcoming" }),
      TeamModel.countDocuments({}),
      TeamModel.countDocuments({ status: "active" }),
      PlayerModel.countDocuments({}),
      PlayerModel.countDocuments({ status: "active" }),
      PlayerModel.countDocuments({ status: "pre_approved" }),
      GameModel.countDocuments({}),
      GameModel.countDocuments({ status: "completed" }),
      GameModel.countDocuments({ status: "scheduled" }),
      GameModel.countDocuments({ status: "in_progress" }),
      GameEventCorrectionModel.countDocuments({ status: "pending" }),
      FlagInterestModel.countDocuments({}),
      FlagInterestModel.countDocuments({ interestType: { $in: ["play", "child"] } }),
      FlagInterestModel.countDocuments({ interestType: "sponsor" }),
    ]);
    const keys = [
      "totalUsers", "activeUsers", "inactiveUsers", "totalAdmins", "totalYouthCoaches", "totalJudges",
      "activeTournaments", "upcomingTournaments", "totalTeams", "activeTeams", "totalPlayers", "activePlayers",
      "preApprovedPlayers", "totalGames", "completedGames", "scheduledGames", "inProgressGames",
      "pendingCorrections", "pendingFlagInterests", "playerFlagInterests", "sponsorFlagInterests",
    ];
    return Object.fromEntries(keys.map((key, index) => [key, values[index]]));
  }

  async listAdminUsers(
    filters: { search?: string; role?: string; isActive?: boolean } = {},
  ): Promise<Record<string, unknown>[]> {
    await this.connect();
    const query: Record<string, unknown> = {};
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: "i" } },
        { email: { $regex: filters.search, $options: "i" } },
      ];
    }
    if (filters.role) query.role = filters.role;
    if (typeof filters.isActive === "boolean") query.isActive = filters.isActive;
    return (await UserModel.find(query, { password: 0 }).sort({ createdAt: -1 }).limit(300).lean()) as Record<
      string,
      unknown
    >[];
  }

  async findAdminUserById(idValue: string): Promise<Record<string, unknown> | null> {
    await this.connect();
    return (await UserModel.findById(idValue, { password: 0 }).lean()) as Record<string, unknown> | null;
  }

  async updateAdminUser(idValue: string, role: string, isActive: boolean): Promise<Record<string, unknown> | null> {
    await this.connect();
    return (await UserModel.findByIdAndUpdate(idValue, { $set: { role, isActive } }, { new: true }).lean()) as Record<
      string,
      unknown
    > | null;
  }

  async countOtherActiveAdmins(excludeUserId: string): Promise<number> {
    await this.connect();
    return UserModel.countDocuments({ _id: { $ne: excludeUserId }, role: "admin", isActive: true });
  }

  async consumeOpenOtps(userId: string, purpose: OtpPurpose, consumedAt: Date): Promise<void> {
    await this.connect();
    await OtpVerificationModel.updateMany(
      { userId: new mongoose.Types.ObjectId(userId), purpose, consumedAt: { $exists: false } },
      { $set: { consumedAt } },
    ).exec();
  }

  async createOtp(data: Omit<OtpRecord, "id" | "createdAt" | "consumedAt">): Promise<void> {
    await this.connect();
    await OtpVerificationModel.create({ ...data, userId: new mongoose.Types.ObjectId(data.userId) });
  }

  async findOpenOtpByToken(purpose: OtpPurpose, tokenHash: string): Promise<OtpRecord | null> {
    await this.connect();
    return otpRecord(await OtpVerificationModel.findOne({ purpose, tokenHash, consumedAt: { $exists: false } }).lean());
  }

  async findLatestOpenOtpByEmail(email: string, purpose: OtpPurpose): Promise<OtpRecord | null> {
    await this.connect();
    return otpRecord(
      await OtpVerificationModel.findOne({ email, purpose, consumedAt: { $exists: false } })
        .sort({ createdAt: -1 })
        .lean(),
    );
  }

  async incrementOtpAttempts(idValue: string): Promise<void> {
    await this.connect();
    await OtpVerificationModel.findByIdAndUpdate(idValue, { $inc: { attempts: 1 } }).exec();
  }

  async consumeOtp(idValue: string, consumedAt: Date): Promise<void> {
    await this.connect();
    await OtpVerificationModel.findByIdAndUpdate(idValue, { $set: { consumedAt } }).exec();
  }

  async deleteExpiredOtps(now: Date): Promise<void> {
    await this.connect();
    await OtpVerificationModel.deleteMany({ expiresAt: { $lt: now } }).exec();
  }

  async findJudgesByIds(ids: string[]): Promise<JudgeRecord[]> {
    await this.connect();
    return (await JudgeModel.find({ _id: { $in: ids } }).lean()).map(judgeRecord);
  }

  async listJudges(): Promise<JudgeRecord[]> {
    await this.connect();
    return (await JudgeModel.find({}).sort({ lastName: 1, firstName: 1 }).lean()).map(judgeRecord);
  }

  async findJudgeByNormalizedName(firstName: string, lastName: string): Promise<JudgeRecord | null> {
    await this.connect();
    const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const row = await JudgeModel.findOne({
      firstName: { $regex: new RegExp(`^${escape(firstName)}$`, "i") },
      lastName: { $regex: new RegExp(`^${escape(lastName)}$`, "i") },
    }).lean();
    return row ? judgeRecord(row) : null;
  }

  async createJudge(firstName: string, lastName: string): Promise<JudgeRecord> {
    await this.connect();
    return judgeRecord(await JudgeModel.create({ firstName, lastName }));
  }

  async findImportSourceKeys(sourceKeys: string[]): Promise<string[]> {
    await this.connect();
    const rows = await PlayerImportMigrationModel.find(
      { sourceKey: { $in: sourceKeys } },
      { sourceKey: 1, _id: 0 },
    ).lean();
    return rows.map((row) => row.sourceKey);
  }

  async createImportMigrations(rows: Array<Record<string, unknown>>): Promise<void> {
    if (!rows.length) return;
    await this.connect();
    try {
      await PlayerImportMigrationModel.insertMany(rows, { ordered: false });
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) throw error;
    }
  }

  async findGameEventSnapshot(gameId: string, eventId: string): Promise<Record<string, unknown> | null> {
    await this.connect();
    return (await GameEventModel.findOne({ _id: eventId, game: gameId }).lean().exec()) as Record<string, unknown> | null;
  }

  async createGameEventCorrection(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.connect();
    return (await GameEventCorrectionModel.create(data)).toObject() as Record<string, unknown>;
  }

  async listPendingGameEventCorrections(): Promise<Record<string, unknown>[]> {
    await this.connect();
    return (await GameEventCorrectionModel.find({ status: "pending" })
      .populate({
        path: "game",
        populate: [
          { path: "homeTeam", select: "name shortName" },
          { path: "awayTeam", select: "name shortName" },
          { path: "tournament", select: "name year" },
          { path: "division", select: "name category" },
        ],
      })
      .populate("proposedEvent.team", "name shortName")
      .populate("proposedEvent.player", "firstName lastName jerseyNumber")
      .populate("originalEvent.team", "name shortName")
      .populate("originalEvent.player", "firstName lastName jerseyNumber")
      .sort({ createdAt: 1 })
      .lean()
      .exec()) as Record<string, unknown>[];
  }

  async findPendingGameEventCorrection(idValue: string): Promise<Record<string, unknown> | null> {
    await this.connect();
    return (await GameEventCorrectionModel.findOne({ _id: idValue, status: "pending" }).lean().exec()) as Record<
      string,
      unknown
    > | null;
  }

  async reviewGameEventCorrection(
    idValue: string,
    status: "approved" | "rejected",
    reviewedById: string,
    reviewedAt: Date,
    reviewNote?: string,
  ): Promise<boolean> {
    await this.connect();
    const result = await GameEventCorrectionModel.updateOne(
      { _id: idValue, status: "pending" },
      { $set: { status, reviewedBy: reviewedById, reviewedAt, reviewNote } },
    ).exec();
    return result.modifiedCount > 0;
  }

  async getSiteSettings(): Promise<Record<string, unknown> | null> {
    await this.connect();
    return (await SiteSettingsModel.findOne({ key: "global" }).lean().exec()) as Record<string, unknown> | null;
  }

  async upsertSiteSettings(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.connect();
    return (await SiteSettingsModel.findOneAndUpdate({ key: "global" }, data, {
      new: true,
      upsert: true,
      runValidators: true,
    })
      .lean()
      .exec()) as Record<string, unknown>;
  }

  async createAuditLog(data: Record<string, unknown>): Promise<void> {
    await this.connect();
    await AdminAuditLogModel.create(data);
  }

  async listAuditLogs(filters: Record<string, string> = {}): Promise<Record<string, unknown>[]> {
    await this.connect();
    return (await AdminAuditLogModel.find(filters).sort({ createdAt: -1 }).limit(200).lean().exec()) as Record<
      string,
      unknown
    >[];
  }

  async createFlagInterest(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.connect();
    return (await FlagInterestModel.create(data)).toObject() as Record<string, unknown>;
  }

  async listFlagInterests(
    filters: { interestType?: string; playerRegistrationsOnly?: boolean } = {},
  ): Promise<Record<string, unknown>[]> {
    await this.connect();
    const query = filters.playerRegistrationsOnly
      ? { interestType: { $in: ["play", "child"] } }
      : filters.interestType
        ? { interestType: filters.interestType }
        : {};
    return (await FlagInterestModel.find(query).sort({ createdAt: -1 }).lean().exec()) as Record<string, unknown>[];
  }

  async listPlayerStatistics(
    filters: { tournament?: string; division?: string; player?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    await this.connect();
    const [rows, total] = await Promise.all([
      PlayerStatisticsModel.find(filters)
        .populate({
          path: "player",
          select: "firstName lastName jerseyNumber position secondaryPosition",
          populate: { path: "team", select: "name shortName logo colors" },
        })
        .populate("tournament", "name year")
        .populate("division", "name category")
        .sort({ [sortBy]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      PlayerStatisticsModel.countDocuments(filters),
    ]);
    return { rows: rows as Record<string, unknown>[], total };
  }

  async listTeamStatistics(
    filters: { tournament?: string; division?: string; team?: string },
    sortBy: string,
    order: 1 | -1,
    page: number,
    limit: number,
  ): Promise<{ rows: Record<string, unknown>[]; total: number }> {
    await this.connect();
    const [rows, total] = await Promise.all([
      TeamStatisticsModel.find(filters)
        .populate("team", "name shortName logo colors")
        .populate("tournament", "name year")
        .populate("division", "name category")
        .sort({ [sortBy]: order })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      TeamStatisticsModel.countDocuments(filters),
    ]);
    return { rows: rows as Record<string, unknown>[], total };
  }

  async upsertTeamStatistics(data: Record<string, unknown>): Promise<Record<string, unknown>> {
    await this.connect();
    return (await TeamStatisticsModel.findOneAndUpdate(
      { team: data.team, tournament: data.tournament, division: data.division },
      data,
      { new: true, upsert: true, runValidators: true },
    )
      .populate("team")
      .populate("tournament")
      .populate("division")
      .lean()) as Record<string, unknown>;
  }
}
