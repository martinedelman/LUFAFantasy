import nodemailer, { type Transporter } from "nodemailer";

export interface EmailAttachment {
  filename: string;
  content?: string | Buffer;
  path?: string;
  contentType?: string;
}

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  attachments?: EmailAttachment[];
}

export interface RegistrationVerificationTemplateData {
  name: string;
  verificationUrl: string;
  code: string;
  expiresInMinutes: number;
}

export type EmailTemplate =
  | {
      name: "registration-verification";
      to: string;
      data: RegistrationVerificationTemplateData;
    };

function getMailFrom() {
  return process.env.MAIL_FROM || "LUFA Fantasy <no-reply@lufafantasy.local>";
}

function getSmtpConfig() {
  const provider = process.env.MAIL_PROVIDER?.toLowerCase();

  return {
    host: process.env.SMTP_HOST,
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
    port: Number(process.env.SMTP_PORT || (provider === "zoho" ? 465 : 587)),
    secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : provider === "zoho",
  };
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderRegistrationVerification(data: RegistrationVerificationTemplateData): EmailMessage {
  const safeName = escapeHtml(data.name);
  const safeUrl = escapeHtml(data.verificationUrl);
  const safeCode = escapeHtml(data.code);

  return {
    to: "",
    subject: "Verificá tu cuenta en LUFA Fantasy",
    text: [
      `Hola ${data.name},`,
      "Para activar tu cuenta de LUFA Fantasy entrá al link y usá este código:",
      data.verificationUrl,
      `Código: ${data.code}`,
      `El código expira en ${data.expiresInMinutes} minutos.`,
    ].join("\n\n"),
    html: `
      <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
        <h1 style="font-size: 22px; margin-bottom: 12px;">Verificá tu cuenta</h1>
        <p>Hola ${safeName},</p>
        <p>Para activar tu cuenta de LUFA Fantasy, abrí este link y confirmá el código:</p>
        <p>
          <a href="${safeUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; padding: 10px 14px; border-radius: 6px; text-decoration: none;">
            Activar cuenta
          </a>
        </p>
        <p style="margin-top: 18px;">Tu código es:</p>
        <p style="font-size: 28px; letter-spacing: 6px; font-weight: 700; margin: 8px 0;">${safeCode}</p>
        <p>Este código expira en ${data.expiresInMinutes} minutos.</p>
      </div>
    `,
  };
}

export class EmailService {
  private transporter: Transporter | null = null;

  private getTransporter() {
    if (this.transporter) {
      return this.transporter;
    }

    const { host, user, pass, port, secure } = getSmtpConfig();

    if (!host || !user || !pass) {
      if (process.env.NODE_ENV === "production") {
        throw new Error("Faltan variables SMTP_HOST, SMTP_USER o SMTP_PASS");
      }

      this.transporter = nodemailer.createTransport({
        jsonTransport: true,
      });
      return this.transporter;
    }

    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
    });

    return this.transporter;
  }

  async send(message: EmailMessage) {
    return this.getTransporter().sendMail({
      from: getMailFrom(),
      ...message,
    });
  }

  async sendTemplate(template: EmailTemplate) {
    if (template.name === "registration-verification") {
      const message = renderRegistrationVerification(template.data);
      return this.send({
        ...message,
        to: template.to,
      });
    }

    throw new Error("Template de email no soportado");
  }
}
