import RepositoryContainer from "@lufa/database/repositories";
import { getAppEnvironment } from "@lufa/database/appEnvironment";
import { getDatabaseProvider } from "@lufa/database/databaseProvider";
import { getAuxiliaryRepository } from "@lufa/database/repositories/auxiliary";
import { getReportingRepository } from "@lufa/database/repositories/reporting";
import { PrismaFantasyCompetitionRepository, PrismaFantasyIdentityRepository } from "@lufa/database/repositories/fantasy";
import { FantasyCompetitionService, FantasyIdentityService } from "@lufa/fantasy-core";
import { AuthService, OtpService } from "@lufa/identity-institutional";
import { BlobStorageService, EmailService, PreApprovedPlayerNotificationService } from "@lufa/integrations";
import { AdminService, DashboardService, PlayerImportService, WeeklyDigestEmailService } from "@lufa/operations";
import {
  DivisionService,
  GameEventCorrectionService,
  GameService,
  JudgeService,
  PlayerRankingService,
  PlayerService,
  StandingService,
  StatisticsService,
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
const teamService = new TeamService(teamRepository);
const divisionService = new DivisionService(divisionRepository);
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
const notificationService = new PreApprovedPlayerNotificationService(emailService);
const dashboardService = new DashboardService(reportingRepository);
const playerImportService = new PlayerImportService(
  playerService,
  teamService,
  notificationService,
  auxiliaryRepository,
);

/** Único composition root del transporte HTTP. */
export const serviceContainer = {
  adminService: new AdminService(playerImportService, auxiliaryRepository, getDatabaseProvider),
  authService,
  blobStorageService: new BlobStorageService(fileStorageRepository, getAppEnvironment),
  correctionService: new GameEventCorrectionService(gameService, auxiliaryRepository),
  dashboardService,
  divisionService,
  emailService,
  fantasyIdentityService,
  fantasyCompetitionService,
  gameService,
  judgeService: new JudgeService(auxiliaryRepository),
  notificationService,
  playerImportService,
  playerService,
  rankingService: new PlayerRankingService(tournamentRepository, divisionRepository, reportingRepository),
  standingService,
  statisticsService: new StatisticsService(gameRepository, playerRepository, teamRepository, auxiliaryRepository),
  teamService,
  tournamentService: new TournamentService(tournamentRepository, divisionRepository, teamRepository, standingService),
  weeklyDigestEmailService: new WeeklyDigestEmailService(emailService, dashboardService, userRepository),
} as const;
