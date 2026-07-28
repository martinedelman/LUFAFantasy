import crypto from "crypto";
import { createSessionToken } from "@/lib/auth";
import { User } from "@/entities/User";
import RepositoryContainer from "@/repositories";
import { getAuxiliaryRepository, type OtpPurpose } from "@/repositories/auxiliary";

const REGISTRATION_OTP_TTL_MINUTES = 15;
const PASSWORD_RESET_OTP_TTL_MINUTES = 15;

export interface RegistrationOtp {
  token: string;
  code: string;
  expiresAt: Date;
  verificationUrl: string;
}

export interface PasswordResetOtp {
  code: string;
  expiresAt: Date;
  expiresInMinutes: number;
}

function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

function getOtpPepper() {
  return process.env.OTP_SECRET || process.env.JWT_SECRET || "development-otp-secret";
}

function hashOtpValue(value: string) {
  return crypto.createHmac("sha256", getOtpPepper()).update(value).digest("hex");
}

function generateNumericCode(length = 6) {
  const min = 10 ** (length - 1);
  const max = 10 ** length - 1;
  return crypto.randomInt(min, max + 1).toString();
}

export class OtpService {
  private userRepo = RepositoryContainer.getUserRepository();
  private auxiliaryRepo = getAuxiliaryRepository();

  async createRegistrationOtp(user: User): Promise<RegistrationOtp> {
    if (!user.id) {
      throw new Error("Usuario inválido para generar OTP");
    }

    const purpose: OtpPurpose = "email_verification";
    const token = crypto.randomBytes(32).toString("hex");
    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MINUTES * 60 * 1000);

    await this.auxiliaryRepo.deleteExpiredOtps(new Date());
    await this.auxiliaryRepo.consumeOpenOtps(user.id, purpose, new Date());
    await this.auxiliaryRepo.createOtp({
      userId: user.id,
      email: user.email,
      purpose,
      tokenHash: hashOtpValue(token),
      codeHash: hashOtpValue(code),
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
    });

    return {
      token,
      code,
      expiresAt,
      verificationUrl: `${getAppUrl()}/auth/verify?token=${encodeURIComponent(token)}`,
    };
  }

  async verifyRegistrationOtp(data: {
    token: string;
    code: string;
  }): Promise<{ user: User; sessionToken: string }> {
    const otp = await this.auxiliaryRepo.findOpenOtpByToken("email_verification", hashOtpValue(data.token));

    if (!otp) {
      throw new Error("Código o link inválido");
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      throw new Error("El código expiró");
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw new Error("Se superó el máximo de intentos");
    }

    const isCodeValid = otp.codeHash === hashOtpValue(data.code.trim());
    if (!isCodeValid) {
      await this.auxiliaryRepo.incrementOtpAttempts(otp.id);
      throw new Error("Código o link inválido");
    }

    await this.auxiliaryRepo.consumeOtp(otp.id, new Date());

    const user = await this.userRepo.updateActiveStatus(otp.userId, true);
    const sessionToken = createSessionToken({
      userId: user.id!,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return { user, sessionToken };
  }

  async createPasswordResetOtp(user: User): Promise<PasswordResetOtp> {
    if (!user.id) {
      throw new Error("Usuario inválido para generar OTP");
    }

    const purpose: OtpPurpose = "password_reset";
    const token = crypto.randomBytes(32).toString("hex");
    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + PASSWORD_RESET_OTP_TTL_MINUTES * 60 * 1000);

    await this.auxiliaryRepo.deleteExpiredOtps(new Date());
    await this.auxiliaryRepo.consumeOpenOtps(user.id, purpose, new Date());
    await this.auxiliaryRepo.createOtp({
      userId: user.id,
      email: user.email,
      purpose,
      tokenHash: hashOtpValue(token),
      codeHash: hashOtpValue(code),
      expiresAt,
      attempts: 0,
      maxAttempts: 5,
    });

    return {
      code,
      expiresAt,
      expiresInMinutes: PASSWORD_RESET_OTP_TTL_MINUTES,
    };
  }

  async verifyPasswordResetOtp(data: { email: string; code: string }): Promise<User> {
    const normalizedEmail = data.email.trim().toLowerCase();
    const otp = await this.auxiliaryRepo.findLatestOpenOtpByEmail(normalizedEmail, "password_reset");

    if (!otp) {
      throw new Error("Código inválido");
    }

    if (otp.expiresAt.getTime() < Date.now()) {
      throw new Error("El código expiró");
    }

    if (otp.attempts >= otp.maxAttempts) {
      throw new Error("Se superó el máximo de intentos");
    }

    const isCodeValid = otp.codeHash === hashOtpValue(data.code.trim());
    if (!isCodeValid) {
      await this.auxiliaryRepo.incrementOtpAttempts(otp.id);
      throw new Error("Código inválido");
    }

    await this.auxiliaryRepo.consumeOtp(otp.id, new Date());

    const user = await this.userRepo.findById(otp.userId);
    if (!user) {
      throw new Error("Usuario no encontrado");
    }

    return user;
  }
}
