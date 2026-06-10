import type { Player } from "@/entities/Player";
import type { Team } from "@/entities/Team";
import { EmailService } from "./EmailService";

const LUFA_ROSTER_EMAIL = "lufaflag@gmail.com";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

function getTeamCoachEmails(team: Team) {
  const coaches = team.coaches && team.coaches.length > 0 ? team.coaches : team.coach ? [team.coach] : [];
  return coaches.map((coach) => normalizeEmail(coach.email)).filter(Boolean);
}

function getCcEmails(team: Team) {
  const emails = [normalizeEmail(team.contact?.email), ...getTeamCoachEmails(team)].filter(Boolean);
  return Array.from(new Set(emails)).filter((email) => email !== LUFA_ROSTER_EMAIL);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-UY", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export function getConfiguredAppUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || process.env.VERCEL_URL;
  const baseUrl = configuredUrl || "http://localhost:3000";
  const withProtocol = baseUrl.startsWith("http://") || baseUrl.startsWith("https://") ? baseUrl : `https://${baseUrl}`;
  return withProtocol.replace(/\/$/, "");
}

export class PreApprovedPlayerNotificationService {
  private emailService = new EmailService();

  async sendRosterAdditionNotification(input: { player: Player; team: Team; playerUrl: string }) {
    const { player, team, playerUrl } = input;
    const playerName = `${player.firstName} ${player.lastName}`;
    const subject = `Agregar jugador al roster ${team.name}`;
    const cc = getCcEmails(team);
    const birthDate = formatDate(player.dateOfBirth);
    const jerseyNumber = player.jerseyNumber ?? "Sin número";

    const text = [
      `Se agregó un jugador al roster de ${team.name}.`,
      "",
      `Jugador: ${playerName}`,
      `Número de camiseta: ${jerseyNumber}`,
      `Fecha de nacimiento: ${birthDate}`,
      `Posición: ${player.position}`,
      "Estado: PRE-APROBADO",
      "",
      `Ver jugador: ${playerUrl}`,
    ].join("\n");

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">Agregar jugador al roster</h1>
        <p>Se agregó un jugador al roster de <strong>${escapeHtml(team.name)}</strong>.</p>
        <table style="border-collapse: collapse; margin: 16px 0;">
          <tbody>
            <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Jugador</td><td style="padding: 4px 0;"><strong>${escapeHtml(playerName)}</strong></td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Número de camiseta</td><td style="padding: 4px 0;">${escapeHtml(String(jerseyNumber))}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Fecha de nacimiento</td><td style="padding: 4px 0;">${escapeHtml(birthDate)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Posición</td><td style="padding: 4px 0;">${escapeHtml(player.position)}</td></tr>
            <tr><td style="padding: 4px 12px 4px 0; color: #6b7280;">Estado</td><td style="padding: 4px 0;"><strong>PRE-APROBADO</strong></td></tr>
          </tbody>
        </table>
        <p>
          <a href="${escapeHtml(playerUrl)}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">
            Ver jugador
          </a>
        </p>
      </div>
    `;

    return this.emailService.send({
      to: LUFA_ROSTER_EMAIL,
      ...(cc.length > 0 && { cc }),
      subject,
      text,
      html,
    });
  }
}
