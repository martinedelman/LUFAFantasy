import { describe, expect, it } from "vitest";
import { FantasyIdentityService, type FantasyIdentityRepository, type FantasyUserRecord } from "./index";

process.env.FANTASY_JWT_SECRET = "test-secret-with-enough-entropy";

function repository(): FantasyIdentityRepository {
  const users: FantasyUserRecord[] = [];
  return {
    findUserById: async (id) => users.find((user) => user.id === id) || null,
    findUserByEmail: async (email) => users.find((user) => user.email === email) || null,
    createUser: async (data) => {
      const now = new Date();
      const user = { id: "user-1", ...data, createdAt: now, updatedAt: now };
      users.push(user);
      return user;
    },
    updateUser: async (id, data) => {
      const user = users.find((item) => item.id === id)!;
      Object.assign(user, data);
      return user;
    },
    createPasswordReset: async () => undefined,
    consumePasswordReset: async () => true,
    getFeatureAssignments: async () => [],
    createAudit: async () => undefined,
  };
}

describe("FantasyIdentityService", () => {
  it("registers and authenticates an independent fantasy user", async () => {
    const service = new FantasyIdentityService(repository(), { sendPasswordReset: async () => undefined });
    const result = await service.register({ name: "Vale", email: "VALE@example.com", password: "jugadora10" });
    expect(result.user.email).toBe("vale@example.com");
    expect(await service.authenticate(result.token)).toMatchObject({ id: "user-1", name: "Vale" });
  });

  it("rejects weak passwords", async () => {
    const service = new FantasyIdentityService(repository(), { sendPasswordReset: async () => undefined });
    await expect(service.register({ name: "Vale", email: "vale@example.com", password: "corta" }))
      .rejects.toThrow("8 caracteres");
  });
});
