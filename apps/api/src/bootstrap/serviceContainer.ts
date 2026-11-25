import RepositoryContainer from "@lufa/database/repositories";
import { getAppEnvironment } from "@lufa/database/appEnvironment";
import { getDatabaseProvider } from "@lufa/database/databaseProvider";
import { getAuxiliaryRepository } from "@lufa/database/repositories/auxiliary";
import { getAnalyticsReportRepository, getReportingRepository } from "@lufa/database/repositories/reporting";
import { PrismaFantasyCompetitionRepository, PrismaFantasyIdentityRepository } from "@lufa/database/repositories/fantasy";
import { FantasyCompetitionService, FantasyIdentityService } from "@lufa/fantasy-core";
import { AuthService, OtpService, PasskeyService } from "@lufa/identity-institutional";
import { PrismaPasskeyRepository } from "@lufa/database/repositories/passkeys";
import { resolvePasskeyConfig } from "@/lib/passkeyConfig";
import { CommerceService } from "@lufa/commerce";
import { PrismaCommerceRepository } from "@lufa/database/repositories/commerce";
import { BlobStorageService, EmailService, HandyPaymentProvider, PreApprovedPlayerNotificationService, type HandyEnvironment } from "@lufa/integrations";
import { AdminService, DashboardService, PlayerImportService, WeeklyDigestEmailService } from "@lufa/operations";
import {
  AnalyticsReportService,
  AnalyticsService,
  DivisionService,
  AdminAnalyticsService,
  GameEventCorrectionService,
  GameService,
  JudgeService,
  PlayerRankingService,
  PlayerService,
  StandingService,
  StatisticsService,
  TeamDefenseRankingService,
  TeamService,
  TournamentService,
} from "@lufa/sports";

const divisionRepository = RepositoryContainer.getDivisionRepository();
const gameRepository = RepositoryContainer.getGameRepository();
const playerRepository = RepositoryContainer.getPlayerRepository();
const standingRepository = RepositoryContainer.getStandingRepository();
const teamRepository = RepositoryContainer.getTeamRepository();
const tournamentRepository = RepositoryContainer.getTournamentRepository();
const auxiliaryRepository = getAuxiliaryRepository();
const reportingRepository = getReportingRepository();
const userRepository = RepositoryContainer.getUserRepository();
const fileStorageRepository = RepositoryContainer.getFileStorageRepository();

const standingService = new StandingService(
  standingRepository,
  gameRepository,
  tournamentRepository,
  teamRepository,
);
const gameService = new GameService(gameRepository, teamRepository, standingService);
const playerService = new PlayerService(playerRepository, teamRepository);
const teamService = new TeamService(teamRepository, divisionRepository);
const divisionService = new DivisionService(divisionRepository, tournamentRepository);
const emailService = new EmailService();
const fantasyIdentityService = new FantasyIdentityService(new PrismaFantasyIdentityRepository(), {
  async sendPasswordReset({ to, name, code, expiresInMinutes }) {
    const safeName = name.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#039;" })[character]!);
    await emailService.send({
      to,
      subject: "Tu código para volver a Fantasy Flag Uruguay",
      text: `Hola ${name}. Tu código es ${code}. Vence en ${expiresInMinutes} minutos.`,
      html: `<div style="font-family:Arial,sans-serif;color:#101713;line-height:1.5"><p>Hola ${safeName},</p><h1 style="font-size:24px">Volvé a tu equipo</h1><p>Usá este código para crear una nueva contraseña:</p><p style="font-size:30px;letter-spacing:8px;font-weight:800">${code}</p><p>Vence en ${expiresInMinutes} minutos.</p></div>`,
    });
  },
});
const fantasyCompetitionService = new FantasyCompetitionService(new PrismaFantasyCompetitionRepository());
const otpService = new OtpService(userRepository, auxiliaryRepository);
const authService = new AuthService(userRepository, emailService, otpService);
// Las passkeys sólo se guardan en PostgreSQL; con MongoDB quedan deshabilitadas.
const passkeyService = new PasskeyService(userRepository, new PrismaPasskeyRepository(), () =>
  resolvePasskeyConfig(process.env, getDatabaseProvider() === "postgres"),
);
const notificationService = new PreApprovedPlayerNotificationService(emailService);
const dashboardService = new DashboardService(reportingRepository);
const playerImportService = new PlayerImportService(
  playerService,
  teamService,
  notificationService,
  auxiliaryRepository,
);
const handyEnvironment = process.env.HANDY_ENVIRONMENT;
const handyEnvironmentConfigured = handyEnvironment === "testing" || handyEnvironment === "production";
const commerceService = new CommerceService(
  new PrismaCommerceRepository(),
  new HandyPaymentProvider({
    merchantSecret: process.env.HANDY_MERCHANT_SECRET || "",
    environment: (handyEnvironmentConfigured ? handyEnvironment : "testing") as HandyEnvironment,
    commerceName: process.env.HANDY_COMMERCE_NAME || "LUFA",
  }),
  {
    liveMode: handyEnvironment === "production",
    returnBaseUrl: (process.env.LUFA_PUBLIC_APP_URL || "http://localhost:3003").replace(/\/$/, ""),
    callbackBaseUrl: (process.env.HANDY_CALLBACK_BASE_URL || "").replace(/\/$/, ""),
    callbackSecret: process.env.HANDY_CALLBACK_SECRET || "",
    reservationMinutes: Number(process.env.COMMERCE_RESERVATION_MINUTES || 30),
    enabled: process.env.COMMERCE_ENABLED === "true",
    environmentConfigured: handyEnvironmentConfigured && Boolean(process.env.HANDY_MERCHANT_SECRET),
  },
);

/** Único composition root del transporte HTTP. */
export const serviceContainer = {
  adminService: new AdminService(playerImportService, auxiliaryRepository, getDatabaseProvider),
  analyticsService: new AnalyticsService(reportingRepository),
  analyticsReportService: new AnalyticsReportService(getAnalyticsReportRepository()),
  adminAnalyticsService: new AdminAnalyticsService(tournamentRepository, divisionRepository, reportingRepository),
  authService,
  blobStorageService: new BlobStorageService(fileStorageRepository, getAppEnvironment),
  correctionService: new GameEventCorrectionService(gameService, auxiliaryRepository),
  commerceService,
  dashboardService,
  divisionService,
  emailService,
  fantasyIdentityService,
  fantasyCompetitionService,
  gameService,
  judgeService: new JudgeService(auxiliaryRepository),
  notificationService,
  passkeyService,
  playerImportService,
  playerService,
  rankingService: new PlayerRankingService(tournamentRepository, divisionRepository, reportingRepository),
  teamDefenseRankingService: new TeamDefenseRankingService(
    gameRepository,
    teamRepository,
    tournamentRepository,
    divisionRepository,
  ),
  standingService,
  statisticsService: new StatisticsService(gameRepository, playerRepository, teamRepository, auxiliaryRepository),
  teamService,
  tournamentService: new TournamentService(tournamentRepository, divisionRepository, teamRepository, standingService),
  weeklyDigestEmailService: new WeeklyDigestEmailService(emailService, dashboardService, userRepository),
} as const;
