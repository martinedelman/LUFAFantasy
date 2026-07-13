import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import sponsorData from "@/data/sponsors.json";
import connectToDatabase from "@/lib/mongodb";
import {
  AdminAuditLogModel,
  FlagInterestModel,
  GameEventCorrectionModel,
  GameModel,
  JudgeModel,
  PlayerModel,
  SiteSettingsModel,
  TeamModel,
  TournamentModel,
  UserModel,
} from "@/models";
import type { User, UserRole } from "@/entities/User";
import { PlayerImportService } from "./PlayerImportService";
import type {
  AdminAuditLogResponseDto,
  AdminPlayerImportDryRunResponseDto,
  AdminSystemHealthResponseDto,
  AdminSystemStatsResponseDto,
  AdminUserResponseDto,
  FlagInterestResponseDto,
  SiteSettingsResponseDto,
  SiteSponsorResponseDto,
  UpdateAdminUserRequestDto,
  UpdateSiteSettingsRequestDto,
} from "@/app/DTOs";

const VALID_ROLES: UserRole[] = ["user", "admin", "juez", "entrenador_juveniles"];
const SETTINGS_KEY = "global";
const DEFAULT_WHATSAPP_MESSAGE =
  "Hola {nombre}, te escribimos de LUFA Flag por tu inscripción para jugar. Queremos contarte los próximos pasos para sumarte a juveniles.";

const defaultSponsors = (sponsorData as Array<{ name: string; image: string; description?: string }>).map(
  (sponsor, index) => ({
    name: sponsor.name,
    image: sponsor.image,
    description: sponsor.description || "",
    url: "",
    visible: true,
    order: index,
  }),
);

function stringifyId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object" && "_id" in value) {
    const id = (value as { _id?: unknown })._id;
    return id ? String(id) : "";
  }
  return String(value);
}

function serializeDate(value?: Date | string | null) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function toAdminUserResponse(user: {
  _id?: unknown;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  lastLogin?: Date;
}): AdminUserResponseDto {
  return {
    id: stringifyId(user._id),
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    createdAt: serializeDate(user.createdAt),
    updatedAt: serializeDate(user.updatedAt),
    lastLogin: serializeDate(user.lastLogin),
  };
}

function toAuditResponse(log: {
  _id?: unknown;
  actorId?: unknown;
  actorName: string;
  actorEmail: string;
  action: string;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  summary: string;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
  createdAt?: Date;
}): AdminAuditLogResponseDto {
  return {
    id: stringifyId(log._id),
    actorId: stringifyId(log.actorId),
    actorName: log.actorName,
    actorEmail: log.actorEmail,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    entityLabel: log.entityLabel,
    summary: log.summary,
    before: log.before,
    after: log.after,
    metadata: log.metadata,
    createdAt: serializeDate(log.createdAt) || new Date().toISOString(),
  };
}

function toSettingsResponse(settings: {
  whatsappMessageTemplate: string;
  contactEmail?: string;
  contactWhatsapp?: string;
  instagramUrl?: string;
  whatsappChannelUrl?: string;
  sponsors?: SiteSponsorResponseDto[];
  homepageAnnouncement?: {
    enabled?: boolean;
    title?: string;
    body?: string;
    imageUrl?: string;
    ctaLabel?: string;
    ctaUrl?: string;
  };
  featureVisibility?: {
    sumateEnabled?: boolean;
    sponsorsVisible?: boolean;
  };
  updatedAt?: Date;
}): SiteSettingsResponseDto {
  return {
    whatsappMessageTemplate: settings.whatsappMessageTemplate || DEFAULT_WHATSAPP_MESSAGE,
    contactEmail: settings.contactEmail || "lufaflag@gmail.com",
    contactWhatsapp: settings.contactWhatsapp || "",
    instagramUrl: settings.instagramUrl || "https://www.instagram.com/lufaflag.uy/",
    whatsappChannelUrl: settings.whatsappChannelUrl || "https://whatsapp.com/channel/0029VbCnCzqKLaHqPlaOvV3W",
    sponsors: (settings.sponsors?.length ? settings.sponsors : defaultSponsors)
      .map((sponsor, index) => ({
        name: sponsor.name || "",
        image: sponsor.image || "",
        description: sponsor.description || "",
        url: sponsor.url || "",
        visible: sponsor.visible !== false,
        order: Number.isFinite(sponsor.order) ? sponsor.order : index,
      }))
      .sort((left, right) => left.order - right.order),
    homepageAnnouncement: {
      enabled: Boolean(settings.homepageAnnouncement?.enabled),
      title: settings.homepageAnnouncement?.title || "",
      body: settings.homepageAnnouncement?.body || "",
      imageUrl: settings.homepageAnnouncement?.imageUrl || "",
      ctaLabel: settings.homepageAnnouncement?.ctaLabel || "",
      ctaUrl: settings.homepageAnnouncement?.ctaUrl || "",
    },
    featureVisibility: {
      sumateEnabled: settings.featureVisibility?.sumateEnabled !== false,
      sponsorsVisible: settings.featureVisibility?.sponsorsVisible !== false,
    },
    updatedAt: serializeDate(settings.updatedAt),
  };
}

function toFlagInterestResponse(doc: {
  _id?: unknown;
  interestType: string;
  interestLabel: string;
  name: string;
  ageRange: string;
  location: string;
  whatsapp: string;
  whatsappDigits: string;
  experience?: string;
  company?: string;
  sponsorInterest?: string;
  createdAt?: Date;
}): FlagInterestResponseDto {
  return {
    id: stringifyId(doc._id),
    interestType: doc.interestType,
    interestLabel: doc.interestLabel,
    name: doc.name,
    ageRange: doc.ageRange,
    location: doc.location,
    whatsapp: doc.whatsapp,
    whatsappDigits: doc.whatsappDigits,
    experience: doc.experience || "",
    company: doc.company || "",
    sponsorInterest: doc.sponsorInterest || "",
    createdAt: serializeDate(doc.createdAt) || new Date().toISOString(),
  };
}

function sanitizeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value.trim() : fallback;
}

function actorObjectId(actor: User) {
  if (!actor.id || !mongoose.Types.ObjectId.isValid(actor.id)) {
    throw new Error("Admin inválido");
  }

  return new mongoose.Types.ObjectId(actor.id);
}

export class AdminService {
  private playerImportService = new PlayerImportService();

  async getSystemStats(): Promise<AdminSystemStatsResponseDto> {
    await connectToDatabase();

    const [
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalAdmins,
      totalYouthCoaches,
      totalJudges,
      activeTournaments,
      upcomingTournaments,
      totalTeams,
      activeTeams,
      totalPlayers,
      activePlayers,
      preApprovedPlayers,
      totalGames,
      completedGames,
      scheduledGames,
      inProgressGames,
      pendingCorrections,
      pendingFlagInterests,
      playerFlagInterests,
      sponsorFlagInterests,
    ] = await Promise.all([
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

    return {
      totalUsers,
      activeUsers,
      inactiveUsers,
      totalAdmins,
      totalYouthCoaches,
      totalJudges,
      activeTournaments,
      upcomingTournaments,
      totalTeams,
      activeTeams,
      totalPlayers,
      activePlayers,
      preApprovedPlayers,
      totalGames,
      completedGames,
      scheduledGames,
      inProgressGames,
      pendingCorrections,
      pendingFlagInterests,
      playerFlagInterests,
      sponsorFlagInterests,
    };
  }

  async listUsers(filters: { search?: string; role?: string; status?: string } = {}) {
    await connectToDatabase();

    const query: Record<string, unknown> = {};
    const search = filters.search?.trim();

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
      ];
    }

    if (filters.role && VALID_ROLES.includes(filters.role as UserRole)) {
      query.role = filters.role;
    }

    if (filters.status === "active") {
      query.isActive = true;
    } else if (filters.status === "inactive") {
      query.isActive = false;
    }

    const users = (await UserModel.find(query, { password: 0 })
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
      .exec()) as unknown as Array<Parameters<typeof toAdminUserResponse>[0]>;

    return users.map(toAdminUserResponse);
  }

  async updateUser(actor: User, targetUserId: string, data: UpdateAdminUserRequestDto) {
    await connectToDatabase();

    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      throw new Error("Usuario inválido");
    }

    const target = await UserModel.findById(targetUserId).exec();
    if (!target) {
      throw new Error("Usuario no encontrado");
    }

    const before = toAdminUserResponse(target);
    const nextRole = data.role ?? target.role;
    const nextIsActive = data.isActive ?? target.isActive;
    const isSelf = actor.id === targetUserId;

    if (!VALID_ROLES.includes(nextRole)) {
      throw new Error("Rol inválido");
    }

    if (isSelf && nextRole !== "admin") {
      throw new Error("No podés quitarte tu propio rol de administrador");
    }

    if (isSelf && !nextIsActive) {
      throw new Error("No podés desactivar tu propio usuario");
    }

    if (target.role === "admin" && (nextRole !== "admin" || !nextIsActive)) {
      const activeAdmins = await UserModel.countDocuments({
        _id: { $ne: target._id },
        role: "admin",
        isActive: true,
      });

      if (activeAdmins === 0) {
        throw new Error("Debe quedar al menos un administrador activo");
      }
    }

    target.role = nextRole;
    target.isActive = nextIsActive;
    await target.save();

    const after = toAdminUserResponse(target);
    await this.recordAudit(actor, {
      action: "user.updated",
      entityType: "user",
      entityId: after.id,
      entityLabel: after.email,
      summary: `Actualizó usuario ${after.email}`,
      before,
      after,
    });

    return after;
  }

  async getSiteSettings() {
    await connectToDatabase();
    const existing = await SiteSettingsModel.findOne({ key: SETTINGS_KEY }).exec();

    if (existing) {
      return toSettingsResponse(existing);
    }

    const created = await SiteSettingsModel.create({
      key: SETTINGS_KEY,
      whatsappMessageTemplate: DEFAULT_WHATSAPP_MESSAGE,
      contactEmail: "lufaflag@gmail.com",
      contactWhatsapp: "",
      instagramUrl: "https://www.instagram.com/lufaflag.uy/",
      whatsappChannelUrl: "https://whatsapp.com/channel/0029VbCnCzqKLaHqPlaOvV3W",
      sponsors: defaultSponsors,
      homepageAnnouncement: {
        enabled: false,
        title: "",
        body: "",
      },
      featureVisibility: {
        sumateEnabled: true,
        sponsorsVisible: true,
      },
    });

    return toSettingsResponse(created);
  }

  async updateSiteSettings(actor: User, data: UpdateSiteSettingsRequestDto) {
    await connectToDatabase();
    const before = await this.getSiteSettings();

    const update: Record<string, unknown> = {};

    if (data.whatsappMessageTemplate !== undefined) {
      const template = sanitizeText(data.whatsappMessageTemplate);
      if (template.length < 10) {
        throw new Error("El mensaje de WhatsApp debe tener al menos 10 caracteres");
      }
      update.whatsappMessageTemplate = template;
    }

    if (data.contactEmail !== undefined) update.contactEmail = sanitizeText(data.contactEmail).toLowerCase();
    if (data.contactWhatsapp !== undefined) update.contactWhatsapp = sanitizeText(data.contactWhatsapp);
    if (data.instagramUrl !== undefined) update.instagramUrl = sanitizeText(data.instagramUrl);
    if (data.whatsappChannelUrl !== undefined) update.whatsappChannelUrl = sanitizeText(data.whatsappChannelUrl);

    if (data.sponsors !== undefined) {
      update.sponsors = data.sponsors.slice(0, 24).map((sponsor, index) => ({
        name: sanitizeText(sponsor.name),
        image: sanitizeText(sponsor.image),
        description: sanitizeText(sponsor.description),
        url: sanitizeText(sponsor.url),
        visible: sponsor.visible !== false,
        order: Number.isFinite(sponsor.order) ? Number(sponsor.order) : index,
      }));
    }

    if (data.homepageAnnouncement !== undefined) {
      update.homepageAnnouncement = {
        enabled: Boolean(data.homepageAnnouncement.enabled),
        title: sanitizeText(data.homepageAnnouncement.title),
        body: sanitizeText(data.homepageAnnouncement.body),
        imageUrl: sanitizeText(data.homepageAnnouncement.imageUrl),
        ctaLabel: sanitizeText(data.homepageAnnouncement.ctaLabel),
        ctaUrl: sanitizeText(data.homepageAnnouncement.ctaUrl),
      };
    }

    if (data.featureVisibility !== undefined) {
      update.featureVisibility = {
        sumateEnabled: data.featureVisibility.sumateEnabled !== false,
        sponsorsVisible: data.featureVisibility.sponsorsVisible !== false,
      };
    }

    const saved = await SiteSettingsModel.findOneAndUpdate(
      { key: SETTINGS_KEY },
      { $set: update },
      { new: true, runValidators: true },
    ).exec();

    const after = toSettingsResponse(saved!);
    await this.recordAudit(actor, {
      action: "settings.updated",
      entityType: "site_settings",
      entityId: SETTINGS_KEY,
      entityLabel: "Configuración del sitio",
      summary: "Actualizó configuración del sitio",
      before,
      after,
    });

    return after;
  }

  async listAuditLogs(filters: { action?: string; entityType?: string; actorEmail?: string } = {}) {
    await connectToDatabase();
    const query: Record<string, unknown> = {};

    if (filters.action) query.action = filters.action;
    if (filters.entityType) query.entityType = filters.entityType;
    if (filters.actorEmail) query.actorEmail = { $regex: filters.actorEmail.trim(), $options: "i" };

    const logs = (await AdminAuditLogModel.find(query)
      .sort({ createdAt: -1 })
      .limit(200)
      .lean()
      .exec()) as unknown as Array<Parameters<typeof toAuditResponse>[0]>;

    return logs.map(toAuditResponse);
  }

  async listFlagInterests(filters: { interestType?: string } = {}) {
    await connectToDatabase();
    const query: Record<string, unknown> = {};

    if (filters.interestType) {
      query.interestType = filters.interestType;
    }

    const docs = (await FlagInterestModel.find(query)
      .sort({ createdAt: -1 })
      .limit(300)
      .lean()
      .exec()) as unknown as Array<Parameters<typeof toFlagInterestResponse>[0]>;

    return docs.map(toFlagInterestResponse);
  }

  async getSystemHealth(): Promise<AdminSystemHealthResponseDto> {
    const configuredCrons = await this.readConfiguredCrons();
    const expectedCrons = [
      { path: "/api/cron/import-players", schedule: "0 6 * * *", label: "Importación diaria de jugadores" },
      { path: "/api/cron/weekly-digest", schedule: "0 8 * * 1", label: "Digest semanal" },
    ];

    const cronRows = expectedCrons.map((expected) => {
      const match = configuredCrons.find((cron) => cron.path === expected.path && cron.schedule === expected.schedule);
      const anyPathMatch = configuredCrons.find((cron) => cron.path === expected.path);

      return {
        path: expected.path,
        schedule: match?.schedule || anyPathMatch?.schedule || expected.schedule,
        expected: true,
        ok: Boolean(match),
        label: expected.label,
      };
    });

    configuredCrons
      .filter((cron) => !expectedCrons.some((expected) => expected.path === cron.path && expected.schedule === cron.schedule))
      .forEach((cron) => {
        cronRows.push({
          path: cron.path,
          schedule: cron.schedule,
          expected: false,
          ok: false,
          label: "Cron extra o con schedule inesperado",
        });
      });

    return {
      checks: [
        this.envCheck("database", "MONGODB_URI", "Conexión a base de datos"),
        this.envCheck("session-signing", "JWT_SECRET", "Firma de sesiones"),
        this.envCheck("public-url", "NEXT_PUBLIC_APP_URL", "URL pública del sitio"),
        this.envCheck("cron-auth", "CRON_SECRET", "Autenticación de procesos programados"),
        this.envCheck("mail-host", "SMTP_HOST", "Servidor de email"),
        this.envCheck("mail-user", "SMTP_USER", "Usuario de email"),
        this.envCheck("mail-password", "SMTP_PASS", "Credencial de email"),
        this.envCheck("player-import-sheet", "GOOGLE_SHEETS_SPREADSHEET_ID", "Planilla de importación"),
        this.envCheck("player-import-account", "GOOGLE_SERVICE_ACCOUNT_EMAIL", "Cuenta de servicio de importación"),
        this.envCheck("player-import-key", "GOOGLE_PRIVATE_KEY", "Credencial de importación"),
        this.envCheck("media-storage", "BLOB_READ_WRITE_TOKEN", "Almacenamiento de medios"),
      ],
      crons: cronRows,
      routes: [
        {
          path: "/api/cron/import-players",
          label: "Importación de jugadores",
          ok: true,
          detail: "Endpoint existente protegido por autenticación de procesos programados",
        },
        {
          path: "/api/cron/weekly-digest",
          label: "Digest semanal",
          ok: true,
          detail: "Endpoint existente; revisar que esté agendado en Vercel",
        },
        {
          path: "/sitemap.xml",
          label: "Sitemap",
          ok: true,
          detail: "Generado por App Router",
        },
        {
          path: "/robots.txt",
          label: "Robots",
          ok: true,
          detail: "Generado por App Router",
        },
        {
          path: "/manifest.webmanifest",
          label: "Manifest",
          ok: true,
          detail: "Generado por App Router",
        },
      ],
    };
  }

  async runPlayerImportDryRun(actor: User): Promise<AdminPlayerImportDryRunResponseDto> {
    const result = await this.playerImportService.importFromGoogleSheet({ dryRun: true });

    await this.recordAudit(actor, {
      action: "player_import.dry_run",
      entityType: "player_import",
      entityLabel: "Importación de jugadores",
      summary: `Ejecutó dry-run de importación: ${result.created} crear, ${result.updated} actualizar, ${result.skipped} omitidas`,
      after: {
        created: result.created,
        updated: result.updated,
        skipped: result.skipped,
        alreadyMigrated: result.alreadyMigrated,
        errors: result.errors.slice(0, 20),
      },
    });

    return {
      created: result.created,
      updated: result.updated,
      skipped: result.skipped,
      alreadyMigrated: result.alreadyMigrated,
      errors: result.errors,
      dryRun: result.dryRun,
    };
  }

  async recordAudit(
    actor: User,
    input: {
      action: string;
      entityType: string;
      entityId?: string;
      entityLabel?: string;
      summary: string;
      before?: unknown;
      after?: unknown;
      metadata?: Record<string, unknown>;
    },
  ) {
    await connectToDatabase();

    await AdminAuditLogModel.create({
      actorId: actorObjectId(actor),
      actorName: actor.name,
      actorEmail: actor.email,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      entityLabel: input.entityLabel,
      summary: input.summary,
      before: input.before,
      after: input.after,
      metadata: input.metadata,
    });
  }

  private async readConfiguredCrons(): Promise<Array<{ path: string; schedule: string }>> {
    try {
      const raw = await fs.readFile(path.join(process.cwd(), "vercel.json"), "utf8");
      const parsed = JSON.parse(raw) as { crons?: Array<{ path?: string; schedule?: string }> };
      return (parsed.crons || [])
        .filter((cron) => cron.path && cron.schedule)
        .map((cron) => ({ path: cron.path!, schedule: cron.schedule! }));
    } catch {
      return [];
    }
  }

  private envCheck(id: string, envName: string, label: string) {
    const ok = Boolean(process.env[envName]);
    return {
      id,
      label,
      ok,
      detail: ok ? "Configurado" : "Falta configurar",
    };
  }
}
