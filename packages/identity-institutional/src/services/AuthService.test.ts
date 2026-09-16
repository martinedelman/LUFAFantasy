import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { User } from "@lufa/sports/entities/User";
import type { ExternalIdentity, ExternalIdentityPort, IUserRepository } from "../ports";
import { verifySessionToken } from "../sessionToken";
import { AuthService, type AuthEmailPort } from "./AuthService";
import type { OtpService } from "./OtpService";

class InMemoryUserRepository implements IUserRepository {
  users: User[] = [];

  async findById(id: string) {
    return this.users.find((user) => user.id === id) ?? null;
  }

  async findByEmail(email: string) {
    return this.users.find((user) => user.email === email) ?? null;
  }

  async findAll() {
    return this.users;
  }

  async create(data: Partial<User>) {
    const user = new User(data.email!, data.passwordHash!, data.name!, data.role, data.isActive, data.id || randomUUID());
    this.users.push(user);
    return user;
  }

  async update(id: string) {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Usuario no encontrado");
    return existing;
  }

  async delete(id: string) {
    this.users = this.users.filter((user) => user.id !== id);
  }

  async exists(id: string) {
    return Boolean(await this.findById(id));
  }

  async findActiveAdmins() {
    return this.users.filter((user) => user.isActive && user.isAdmin());
  }

  async updateActiveStatus(id: string, isActive: boolean) {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Usuario no encontrado");
    const updated = new User(existing.email, existing.passwordHash, existing.name, existing.role, isActive, existing.id);
    this.users = this.users.map((user) => (user.id === id ? updated : user));
    return updated;
  }

  async updatePasswordHash(id: string, passwordHash: string) {
    const existing = await this.findById(id);
    if (!existing) throw new Error("Usuario no encontrado");
    const updated = new User(existing.email, passwordHash, existing.name, existing.role, existing.isActive, existing.id);
    this.users = this.users.map((user) => (user.id === id ? updated : user));
    return updated;
  }
}

const emailService: AuthEmailPort = { sendTemplate: vi.fn() };
const otpService = {} as OtpService;

function identityPort(identity: ExternalIdentity): ExternalIdentityPort {
  return { verifyIdToken: vi.fn().mockResolvedValue(identity) };
}

function service(repository: InMemoryUserRepository, externalIdentity?: ExternalIdentityPort) {
  return new AuthService(repository, emailService, otpService, externalIdentity);
}

describe("AuthService.loginWithExternalIdToken", () => {
  beforeEach(() => {
    process.env.JWT_SECRET = "test";
  });

  it("crea un usuario activo nuevo con rol user", async () => {
    const repository = new InMemoryUserRepository();
    const result = await service(repository, identityPort({
      subject: "auth0|new",
      email: "new@example.com",
      emailVerified: true,
      name: "Nuevo Usuario",
    })).loginWithExternalIdToken("id-token");

    expect(result.user.email).toBe("new@example.com");
    expect(result.user.name).toBe("Nuevo Usuario");
    expect(result.user.role).toBe("user");
    expect(result.user.isActive).toBe(true);
    expect(repository.users).toHaveLength(1);
  });

  it("reutiliza el usuario existente por email y devuelve un token", async () => {
    const repository = new InMemoryUserRepository();
    const existing = await repository.create({
      email: "existing@example.com",
      passwordHash: "hash",
      name: "Existente",
      role: "user",
      isActive: true,
    });

    const result = await service(repository, identityPort({
      subject: "auth0|existing",
      email: existing.email,
      emailVerified: true,
    })).loginWithExternalIdToken("id-token");

    expect(result.user.id).toBe(existing.id);
    expect(verifySessionToken(result.token)?.userId).toBe(existing.id);
    expect(repository.users).toHaveLength(1);
  });

  it("reactiva un usuario existente inactivo", async () => {
    const repository = new InMemoryUserRepository();
    const existing = await repository.create({
      email: "inactive@example.com",
      passwordHash: "hash",
      name: "Inactivo",
      role: "user",
      isActive: false,
    });

    const result = await service(repository, identityPort({
      subject: "auth0|inactive",
      email: existing.email,
      emailVerified: true,
    })).loginWithExternalIdToken("id-token");

    expect(result.user.id).toBe(existing.id);
    expect(result.user.isActive).toBe(true);
  });

  it("rechaza una identidad con email sin verificar", async () => {
    await expect(service(new InMemoryUserRepository(), identityPort({
      subject: "auth0|unverified",
      email: "unverified@example.com",
      emailVerified: false,
    })).loginWithExternalIdToken("id-token")).rejects.toThrow("Verificá tu email en Auth0 antes de ingresar");
  });

  it("rechaza el login si no hay proveedor configurado", async () => {
    await expect(service(new InMemoryUserRepository()).loginWithExternalIdToken("id-token")).rejects.toThrow(
      "Auth0 no está configurado",
    );
  });
});
