import jwt from "jsonwebtoken";
import type { UserRole } from "@lufa/sports/entities/User";

export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  userId: string;
  name: string;
  email: string;
  role: UserRole;
}

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("Falta configurar la firma de sesiones");
  return secret;
}

export function createSessionToken(payload: SessionPayload) {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: SESSION_MAX_AGE_SECONDS });
}

export function verifySessionToken(token: string) {
  try {
    return jwt.verify(token, getJwtSecret()) as SessionPayload;
  } catch {
    return null;
  }
}
