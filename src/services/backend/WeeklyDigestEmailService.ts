import connectToDatabase from "@/lib/mongodb";
import { UserModel } from "@/models";
import type { NextGameResponseDto, TopPlayerResponseDto } from "@/app/DTOs";
import { DashboardService } from "./DashboardService";
import { EmailService } from "./EmailService";

const DIGEST_TIME_ZONE = "America/Montevideo";
const SEND_BATCH_SIZE = 10;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat("es-UY", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: DIGEST_TIME_ZONE,
  }).format(new Date(date));
}

function buildDigestText(games: NextGameResponseDto[], topScorers: TopPlayerResponseDto[]) {
  const gamesText =
    games.length > 0
      ? games
          .map((game, index) => {
            return `${index + 1}. ${game.homeTeam} vs ${game.awayTeam} - ${formatDate(game.scheduledDate)} - ${game.venue}`;
          })
          .join("\n")
      : "No hay partidos programados por ahora.";

  const scorersText =
    topScorers.length > 0
      ? topScorers
          .map((scorer, index) => {
            return `${index + 1}. ${scorer.name} (${scorer.team}) - ${scorer.stat} pts`;
          })
          .join("\n")
      : "Todavía no hay anotadores para destacar.";

  return [
    "LUFA Fantasy - Agenda semanal",
    "",
    "Próximos 4 partidos:",
    gamesText,
    "",
    "Top 5 anotadores:",
    scorersText,
  ].join("\n");
}

function renderGameCard(game: NextGameResponseDto) {
  const home = escapeHtml(game.homeTeam);
  const away = escapeHtml(game.awayTeam);
  const date = escapeHtml(formatDate(game.scheduledDate));
  const venue = escapeHtml(game.venue);
  const division = escapeHtml(game.division);

  return `
    <tr>
      <td style="padding: 14px 0; border-bottom: 1px solid #e5e7eb;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
          <tr>
            <td>
              <p style="margin: 0 0 6px; color: #64748b; font-size: 12px; text-transform: uppercase; letter-spacing: .08em;">${division}</p>
              <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 800;">${home} <span style="color: #16a34a;">vs</span> ${away}</p>
              <p style="margin: 8px 0 0; color: #475569; font-size: 14px;">${date} · ${venue}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `;
}

function renderScorerRow(scorer: TopPlayerResponseDto, index: number) {
  const playerName = escapeHtml(scorer.name);
  const team = escapeHtml(scorer.team);

  return `
    <tr>
      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb; width: 42px;">
        <span style="display: inline-block; width: 30px; height: 30px; border-radius: 999px; background: #dcfce7; color: #166534; text-align: center; line-height: 30px; font-weight: 800;">${index + 1}</span>
      </td>
      <td style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <p style="margin: 0; color: #0f172a; font-size: 15px; font-weight: 800;">${playerName}</p>
        <p style="margin: 3px 0 0; color: #64748b; font-size: 13px;">${team} · ${escapeHtml(scorer.position)}</p>
      </td>
      <td align="right" style="padding: 10px 0; border-bottom: 1px solid #e5e7eb;">
        <span style="color: #0f172a; font-size: 18px; font-weight: 900;">${scorer.stat}</span>
        <span style="color: #64748b; font-size: 12px;"> ${escapeHtml(scorer.statLabel.toLowerCase())}</span>
      </td>
    </tr>
  `;
}

function renderDigestHtml(games: NextGameResponseDto[], topScorers: TopPlayerResponseDto[]) {
  const gamesHtml =
    games.length > 0
      ? games.map(renderGameCard).join("")
      : `<tr><td style="padding: 16px 0; color: #64748b;">No hay partidos programados por ahora.</td></tr>`;

  const scorersHtml =
    topScorers.length > 0
      ? topScorers.map(renderScorerRow).join("")
      : `<tr><td style="padding: 16px 0; color: #64748b;">Todavía no hay anotadores para destacar.</td></tr>`;

  return `
    <div style="margin: 0; padding: 0; background: #f1f5f9; font-family: Arial, Helvetica, sans-serif;">
      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f1f5f9; padding: 28px 12px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width: 680px; background: #ffffff; border-radius: 14px; overflow: hidden; box-shadow: 0 18px 45px rgba(15, 23, 42, .12);">
              <tr>
                <td style="padding: 34px 34px 28px; background: #0f172a;">
                  <p style="margin: 0 0 10px; color: #86efac; font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: .12em;">Agenda LUFA</p>
                  <h1 style="margin: 0; color: #ffffff; font-size: 30px; line-height: 1.12;">Tu jornada de flag arranca acá</h1>
                  <p style="margin: 14px 0 0; color: #cbd5e1; font-size: 16px; line-height: 1.5;">Los cruces que se vienen y el top de anotadores para llegar al finde con toda la información actualizada.</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 28px 34px 10px;">
                  <h2 style="margin: 0 0 6px; color: #0f172a; font-size: 22px;">Próximos 4 partidos</h2>
                  <p style="margin: 0 0 6px; color: #64748b; font-size: 14px;">Marcá agenda, armá previa y seguí la acción.</p>
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${gamesHtml}</table>
                </td>
              </tr>
              <tr>
                <td style="padding: 22px 34px 32px;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 18px;">
                    <tr>
                      <td>
                        <h2 style="margin: 0 0 4px; color: #0f172a; font-size: 22px;">Top 5 anotadores</h2>
                        <p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Los nombres calientes de la tabla.</p>
                        <table role="presentation" width="100%" cellspacing="0" cellpadding="0">${scorersHtml}</table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding: 20px 34px; background: #ecfdf5;">
                  <p style="margin: 0; color: #166534; font-size: 14px; font-weight: 700;">Nos vemos en la cancha. LUFA Flag</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </div>
  `;
}

export class WeeklyDigestEmailService {
  private emailService = new EmailService();
  private dashboardService = new DashboardService();

  async sendWeeklyDigest() {
    await connectToDatabase();

    const [users, dashboardStats] = await Promise.all([
      this.getRecipients(),
      this.dashboardService.getStats({
        nextGamesLimit: 4,
        topPlayersLimit: 5,
      }),
    ]);

    const html = renderDigestHtml(dashboardStats.nextGames, dashboardStats.topPlayers);
    const text = buildDigestText(dashboardStats.nextGames, dashboardStats.topPlayers);
    const results = [];

    for (let index = 0; index < users.length; index += SEND_BATCH_SIZE) {
      const batch = users.slice(index, index + SEND_BATCH_SIZE);
      const batchResults = await Promise.allSettled(
        batch.map((user) =>
          this.emailService.send({
            to: user.email,
            subject: "Agenda LUFA: próximos partidos y top anotadores",
            html,
            text,
          }),
        ),
      );

      results.push(...batchResults);
    }

    return {
      recipients: users.length,
      sent: results.filter((result) => result.status === "fulfilled").length,
      failed: results.filter((result) => result.status === "rejected").length,
      upcomingGames: dashboardStats.nextGames.length,
      topScorers: dashboardStats.topPlayers.length,
    };
  }

  private async getRecipients() {
    return UserModel.find({ isActive: true }, { email: 1 }).lean<{ email: string }[]>().exec();
  }
}
