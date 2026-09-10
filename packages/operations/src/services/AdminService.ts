import fs from "fs/promises";
import path from "path";
import sponsorData from "../sponsors.json";
import type { User, UserRole } from "@lufa/sports/entities/User";
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
} from "@lufa/contracts";

const VALID_ROLES: UserRole[] = ["user", "admin", "juez", "entrenador_juveniles"];
const SETTINGS_KEY = "global";
const DEFAULT_WHATSAPP_MESSAGE =
  "Hola {nombre}, te escribimos de LUFA Flag por tu inscripción para jugar. Queremos contarte los próximos pasos para sumarte a juveniles.";

export interface AdminRepositoryPort {
  getAdminSystemCounts(): Promise<Record<string, number>>;
  listAdminUsers(filters?: { search?: string; role?: string; isActive?: boolean }): Promise<Record<string, unknown>[]>;
  findAdminUserById(id: string): Promise<Record<string, unknown> | null>;
  updateAdminUser(id: string, role: string, isActive: boolean): Promise<Record<string, unknown> | null>;
  countOtherActiveAdmins(excludeUserId: string): Promise<number>;
  getSiteSettings(): Promise<Record<string, unknown> | null>;
  upsertSiteSettings(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  listAuditLogs(filters?: Record<string, string>): Promise<Record<string, unknown>[]>;
  listFlagInterests(filters?: { interestType?: string; playerRegistrationsOnly?: boolean }): Promise<Record<string, unknown>[]>;
  createAuditLog(data: Record<string, unknown>): Promise<void>;
}

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
  if (typeof value === "object" && value && ("id" in value || "_id" in value)) {
    const record = value as { id?: unknown; _id?: unknown };
    const id = record.id ?? record._id;
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

function actorId(actor: User) {
  if (!actor.id) {
    throw new Error("Admin inválido");
  }
  return actor.id;
}

export class AdminService {
  constructor(
    private readonly playerImportService: PlayerImportService,
    private readonly auxiliaryRepo: AdminRepositoryPort,
    private readonly databaseProvider: () => "mongodb" | "postgres",
  ) {}

  async getSystemStats(): Promise<AdminSystemStatsResponseDto> {
    return (await this.auxiliaryRepo.getAdminSystemCounts()) as unknown as AdminSystemStatsResponseDto;
  }

  async listUsers(filters: { search?: string; role?: string; status?: string } = {}) {
    const search = filters.search?.trim();
    const users = (await this.auxiliaryRepo.listAdminUsers({
      ...(search ? { search } : {}),
      ...(filters.role && VALID_ROLES.includes(filters.role as UserRole) ? { role: filters.role } : {}),
      ...(filters.status === "active"
        ? { isActive: true }
        : filters.status === "inactive"
          ? { isActive: false }
          : {}),
    })) as unknown as Array<Parameters<typeof toAdminUserResponse>[0]>;

    return users.map(toAdminUserResponse);
  }

  async updateUser(actor: User, targetUserId: string, data: UpdateAdminUserRequestDto) {
    if (!targetUserId) {
      throw new Error("Usuario inválido");
    }

    const target = (await this.auxiliaryRepo.findAdminUserById(targetUserId)) as unknown as
      | Parameters<typeof toAdminUserResponse>[0]
      | null;
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
      const activeAdmins = await this.auxiliaryRepo.countOtherActiveAdmins(targetUserId);

      if (activeAdmins === 0) {
        throw new Error("Debe quedar al menos un administrador activo");
      }
    }

    const updated = await this.auxiliaryRepo.updateAdminUser(targetUserId, nextRole, nextIsActive);
    if (!updated) throw new Error("Usuario no encontrado");
    const after = toAdminUserResponse(updated as unknown as Parameters<typeof toAdminUserResponse>[0]);
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
    const existing = await this.auxiliaryRepo.getSiteSettings();

    if (existing) {
      return toSettingsResponse(existing as unknown as Parameters<typeof toSettingsResponse>[0]);
    }

    const created = await this.auxiliaryRepo.upsertSiteSettings({
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

    return toSettingsResponse(created as unknown as Parameters<typeof toSettingsResponse>[0]);
  }

  async updateSiteSettings(actor: User, data: UpdateSiteSettingsRequestDto) {
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

    const saved = await this.auxiliaryRepo.upsertSiteSettings({ ...before, ...update });

    const after = toSettingsResponse(saved as unknown as Parameters<typeof toSettingsResponse>[0]);
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
    const logs = (await this.auxiliaryRepo.listAuditLogs({
      ...(filters.action ? { action: filters.action } : {}),
      ...(filters.entityType ? { entityType: filters.entityType } : {}),
      ...(filters.actorEmail ? { actorEmail: filters.actorEmail.trim() } : {}),
    })) as unknown as Array<Parameters<typeof toAuditResponse>[0]>;

    return logs.map(toAuditResponse);
  }

  async listFlagInterests(filters: { interestType?: string } = {}) {
    const docs = (await this.auxiliaryRepo.listFlagInterests(filters)) as unknown as Array<
      Parameters<typeof toFlagInterestResponse>[0]
    >;

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
        this.envCheck(
          "database",
          this.databaseProvider() === "postgres" ? "DATABASE_URL" : "MONGODB_URI",
          "Conexión a base de datos",
        ),
        this.envCheck("session-signing", "JWT_SECRET", "Firma de sesiones"),
        this.envCheck("public-url", "INSTITUTIONAL_APP_URL", "URL pública del sitio institucional"),
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
    await this.auxiliaryRepo.createAuditLog({
      actorId: actorId(actor),
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
