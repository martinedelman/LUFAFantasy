import { OAuth2Client } from "google-auth-library";
import nodemailer from "nodemailer";
import type { EmailMessage } from "./EmailService";

export class GmailApiTransport {
  private readonly auth: OAuth2Client;
  private readonly mime = nodemailer.createTransport({ streamTransport: true, buffer: true });

  constructor() {
    const clientId = process.env.GOOGLE_GMAIL_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_GMAIL_CLIENT_SECRET;
    const refreshToken = process.env.GOOGLE_GMAIL_REFRESH_TOKEN;

    if (!clientId || !clientSecret || !refreshToken || !process.env.MAIL_FROM) {
      throw new Error("Gmail API requiere MAIL_FROM, GOOGLE_GMAIL_CLIENT_ID, GOOGLE_GMAIL_CLIENT_SECRET y GOOGLE_GMAIL_REFRESH_TOKEN");
    }

    this.auth = new OAuth2Client({ clientId, clientSecret });
    this.auth.setCredentials({ refresh_token: refreshToken });
  }

  async send(message: EmailMessage & { from: string }) {
    const { message: mime } = await this.mime.sendMail(message);
    try {
      const { data } = await this.auth.request<{ id: string; threadId: string }>({
        url: "https://gmail.googleapis.com/gmail/v1/users/me/messages/send",
        method: "POST",
        data: { raw: mime.toString("base64url") },
        retry: false,
        timeout: 15_000,
      });
      return { messageId: data.id, threadId: data.threadId };
    } catch (error) {
      // Google client errors may contain the bearer token and the message body.
      const status = (error as { response?: { status?: number } })?.response?.status;
      throw new Error(status ? `Falló el envío por Gmail API (HTTP ${status})` : "Falló la conexión a Gmail API");
    }
  }
}
