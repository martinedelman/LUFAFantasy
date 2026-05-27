import crypto from "crypto";
import mongoose from "mongoose";
import { createSessionToken } from "@/lib/auth";
import connectToDatabase from "@/lib/mongodb";
import { User } from "@/entities/User";
import RepositoryContainer from "@/repositories";
import { OtpVerificationModel, type OtpPurpose } from "@/models/OtpVerification";

const REGISTRATION_OTP_TTL_MINUTES = 15;

export interface RegistrationOtp {
  token: string;
  code: string;
  expiresAt: Date;
  verificationUrl: string;
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

  async createRegistrationOtp(user: User): Promise<RegistrationOtp> {
    if (!user.id) {
      throw new Error("Usuario inválido para generar OTP");
    }

    await connectToDatabase();

    const purpose: OtpPurpose = "email_verification";
    const token = crypto.randomBytes(32).toString("hex");
    const code = generateNumericCode();
    const expiresAt = new Date(Date.now() + REGISTRATION_OTP_TTL_MINUTES * 60 * 1000);

    await OtpVerificationModel.updateMany(
      {
        userId: new mongoose.Types.ObjectId(user.id),
        purpose,
        consumedAt: { $exists: false },
      },
      {
        $set: {
          consumedAt: new Date(),
        },
      },
    ).exec();

    await OtpVerificationModel.create({
      userId: new mongoose.Types.ObjectId(user.id),
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
    await connectToDatabase();

    const otp = await OtpVerificationModel.findOne({
      purpose: "email_verification",
      tokenHash: hashOtpValue(data.token),
      consumedAt: { $exists: false },
    }).exec();

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
      otp.attempts += 1;
      await otp.save();
      throw new Error("Código o link inválido");
    }

    otp.consumedAt = new Date();
    await otp.save();

    const user = await this.userRepo.updateActiveStatus(otp.userId.toString(), true);
    const sessionToken = createSessionToken({
      userId: user.id!,
      name: user.name,
      email: user.email,
      role: user.role,
    });

    return { user, sessionToken };
  }
}
