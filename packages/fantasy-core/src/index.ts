import * as bcrypt from "bcryptjs";
import { createHash, randomInt } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

export const FANTASY_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

export interface FantasyUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FantasyPublicUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export interface FantasyFeatureAssignment {
  key: string;
  enabled: boolean;
}

export interface FantasyIdentityRepository {
  findUserById(id: string): Promise<FantasyUserRecord | null>;
  findUserByEmail(email: string): Promise<FantasyUserRecord | null>;
  createUser(data: { name: string; email: string; passwordHash: string }): Promise<FantasyUserRecord>;
  updateUser(id: string, data: { name?: string; passwordHash?: string }): Promise<FantasyUserRecord>;
  createPasswordReset(data: { userId: string; codeHash: string; expiresAt: Date }): Promise<void>;
  consumePasswordReset(data: { userId: string; codeHash: string; now: Date }): Promise<boolean>;
  getFeatureAssignments(userId: string): Promise<FantasyFeatureAssignment[]>;
  createAudit(data: {
    actorId?: string;
    action: string;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}

export interface FantasyEmailPort {
  sendPasswordReset(data: { to: string; name: string; code: string; expiresInMinutes: number }): Promise<void>;
}

export interface FantasySessionPayload {
  userId: string;
  email: string;
  product: "fantasy";
}

function normalizedEmail(value: string) {
  return value.trim().toLowerCase();
}

function validatePassword(password: string) {
  if (password.length < 8) throw new Error("La contraseña debe tener al menos 8 caracteres");
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new Error("La contraseña debe combinar letras y números");
  }
}

function publicUser(user: FantasyUserRecord): FantasyPublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    createdAt: user.createdAt.toISOString(),
  };
}

function resetHash(userId: string, code: string) {
  const secret = process.env.FANTASY_RESET_SECRET || process.env.FANTASY_JWT_SECRET || (process.env.NODE_ENV !== "production" ? process.env.JWT_SECRET : undefined);
  if (!secret) throw new Error("Falta configurar FANTASY_RESET_SECRET");
  return createHash("sha256").update(`${userId}:${code}:${secret}`).digest("hex");
}

function sessionSecret() {
  const secret = process.env.FANTASY_JWT_SECRET || (process.env.NODE_ENV !== "production" ? process.env.JWT_SECRET : undefined);
  if (!secret) throw new Error("Falta configurar FANTASY_JWT_SECRET");
  return new TextEncoder().encode(secret);
}

export class FantasyIdentityService {
  constructor(
    private readonly repository: FantasyIdentityRepository,
    private readonly email: FantasyEmailPort,
  ) {}

  async register(data: { name: string; email: string; password: string }) {
    const name = data.name.trim();
    const email = normalizedEmail(data.email);
    if (name.length < 2) throw new Error("Ingresá tu nombre");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Ingresá un email válido");
    validatePassword(data.password);
    if (await this.repository.findUserByEmail(email)) throw new Error("El email ya está registrado");

    const user = await this.repository.createUser({
      name,
      email,
      passwordHash: await bcrypt.hash(data.password, 12),
    });
    await this.repository.createAudit({ actorId: user.id, action: "fantasy.user.registered" });
    return { user: publicUser(user), token: await this.createSession(user) };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.repository.findUserByEmail(normalizedEmail(data.email));
    if (!user || !(await bcrypt.compare(data.password, user.passwordHash))) {
      throw new Error("Email o contraseña incorrectos");
    }
    await this.repository.createAudit({ actorId: user.id, action: "fantasy.session.started" });
    return { user: publicUser(user), token: await this.createSession(user) };
  }

  async authenticate(token: string) {
    try {
      const { payload } = await jwtVerify(token, sessionSecret(), { issuer: "fantasy.flag.lufa" });
      if (payload.product !== "fantasy" || typeof payload.sub !== "string") return null;
      const user = await this.repository.findUserById(payload.sub);
      return user ? publicUser(user) : null;
    } catch {
      return null;
    }
  }

  async updateProfile(userId: string, name: string) {
    const cleanName = name.trim();
    if (cleanName.length < 2) throw new Error("Ingresá tu nombre");
    const user = await this.repository.updateUser(userId, { name: cleanName });
    await this.repository.createAudit({ actorId: userId, action: "fantasy.profile.updated" });
    return publicUser(user);
  }

  async requestPasswordReset(emailValue: string) {
    const user = await this.repository.findUserByEmail(normalizedEmail(emailValue));
    if (!user) return;
    const code = String(randomInt(100000, 1000000));
    const expiresInMinutes = 15;
    await this.repository.createPasswordReset({
      userId: user.id,
      codeHash: resetHash(user.id, code),
      expiresAt: new Date(Date.now() + expiresInMinutes * 60_000),
    });
    await this.email.sendPasswordReset({ to: user.email, name: user.name, code, expiresInMinutes });
    await this.repository.createAudit({ actorId: user.id, action: "fantasy.password_reset.requested" });
  }

  async resetPassword(data: { email: string; code: string; password: string }) {
    validatePassword(data.password);
    const user = await this.repository.findUserByEmail(normalizedEmail(data.email));
    if (!user) throw new Error("Código inválido o vencido");
    const consumed = await this.repository.consumePasswordReset({
      userId: user.id,
      codeHash: resetHash(user.id, data.code.trim()),
      now: new Date(),
    });
    if (!consumed) throw new Error("Código inválido o vencido");
    await this.repository.updateUser(user.id, { passwordHash: await bcrypt.hash(data.password, 12) });
    await this.repository.createAudit({ actorId: user.id, action: "fantasy.password_reset.completed" });
  }

  async bootstrap(userId: string) {
    const configuredDefaults: Record<string, boolean> = {
      invitations: true,
      leagues: false,
      live_scoring: false,
    };
    const assignments = await this.repository.getFeatureAssignments(userId);
    for (const assignment of assignments) configuredDefaults[assignment.key] = assignment.enabled;
    return { features: configuredDefaults };
  }

  private async createSession(user: FantasyUserRecord) {
    return new SignJWT({ email: user.email, product: "fantasy" })
      .setProtectedHeader({ alg: "HS256" })
      .setSubject(user.id)
      .setIssuer("fantasy.flag.lufa")
      .setIssuedAt()
      .setExpirationTime(`${FANTASY_SESSION_MAX_AGE_SECONDS}s`)
      .sign(sessionSecret());
  }
}
