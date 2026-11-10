import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { disconnectPrisma, getPrismaClient } from "@lufa/database/prisma";
import RepositoryContainer from "@lufa/database/repositories";
import { PrismaAuxiliaryRepository } from "@lufa/database/repositories/auxiliary/PrismaAuxiliaryRepository";
import { OtpService } from "@lufa/identity-institutional";
import type { DigitalCredentialCandidateResponseDto, DigitalCredentialResponseDto } from "@lufa/contracts";
import { GET as search } from "./candidates/route";
import { POST as issue } from "./issue-official/route";
import { POST as issuePlayer } from "./issue-player/route";
import { PATCH as update } from "./[id]/route";
import { GET as mine } from "@/app/api/digital-credentials/me/route";
import { GET as verify } from "@/app/api/digital-credentials/verify/[publicId]/route";

const { currentUser } = vi.hoisted(() => ({ currentUser: vi.fn() }));
vi.mock("@/lib/currentUser", () => ({ currentUserFromRequest: currentUser }));

const prefix = "real-id-test";
const admin = { id: `${prefix}-admin`, email: `${prefix}-admin@example.com`, name: "Admin ID", isAdmin: () => true };
const email = `${prefix}-sofia@example.com`;
const teamId = `${prefix}-team`;
const playerId = `${prefix}-player`;
const person = { displayName: "Sofía Rodríguez", organizationName: "LUFA", nationalityCode: "UY", dateOfBirth: "1988-03-14" };
const base = "http://localhost/api/admin/digital-credentials";

function mutation(path: string, method: "POST" | "PATCH", body: object) {
  return new NextRequest(`${base}${path}`, { method, body: JSON.stringify(body) });
}

function searchFor(text: string, type: "player" | "official" = "player") {
  return search(new NextRequest(`${base}/candidates?${new URLSearchParams({ search: text, type })}`));
}

function verifyId(publicId: string) {
  return verify(new NextRequest(`http://localhost/api/digital-credentials/verify/${publicId}`), { params: Promise.resolve({ publicId }) });
}

async function removeFixtures() {
  const db = getPrismaClient();
  const credentials = await db.digitalCredential.findMany({ where: {
    OR: [{ claimEmail: { startsWith: prefix } }, { playerId }, { judgeId: `${prefix}-judge` }],
  }, select: { id: true } });
  const ids = credentials.map(({ id }) => id);
  await db.digitalCredentialAudit.deleteMany({ where: { credentialId: { in: ids } } });
  await db.adminAuditLog.deleteMany({ where: { actorId: admin.id } });
  await db.digitalCredential.deleteMany({ where: { id: { in: ids } } });
  await db.player.deleteMany({ where: { teamId } });
  await db.team.deleteMany({ where: { id: teamId } });
  await db.division.deleteMany({ where: { id: `${prefix}-division` } });
  await db.judge.deleteMany({ where: { id: `${prefix}-judge` } });
  await db.user.deleteMany({ where: { id: { startsWith: prefix } } });
}

describe.skipIf(process.env.LUFA_REAL_ID_POSTGRES_TEST !== "1")("Real ID con PostgreSQL", () => {
  beforeAll(async () => {
    await removeFixtures();
    const db = getPrismaClient();
    await db.user.create({ data: { id: admin.id, email: admin.email, name: admin.name, passwordHash: "unused", role: "admin" } });
    await db.division.create({ data: { id: `${prefix}-division`, name: "División Real ID", category: "open" } });
    await db.team.create({ data: {
      id: teamId, name: "Equipo Real ID", divisionId: `${prefix}-division`, colors: {}, contact: {},
      registrationDate: new Date(), coaches: [{ name: "Sofía Rodríguez", email }],
    } });
    await db.judge.create({ data: {
      id: `${prefix}-judge`, firstName: "René", lastName: "Pérez", normalizedName: "rene perez",
    } });
    const player = { teamId, dateOfBirth: new Date("1988-03-14"), position: "QB", registrationDate: new Date() };
    await db.player.createMany({ data: [
      ...Array.from({ length: 305 }, (_, index) => ({ ...player, firstName: `Persona ${index}`, lastName: "Acuña" })),
      { ...player, id: playerId, firstName: "Sofía", lastName: "Rodríguez", email },
      { ...player, firstName: "Sofía", lastName: "Rodríguez" },
    ] });
  });

  afterAll(async () => {
    await removeFixtures();
    await disconnectPrisma();
  });

  beforeEach(() => currentUser.mockResolvedValue(admin));

  it("busca antes del límite y conserva el origen de las fichas", async () => {
    const response = await searchFor("rodrig sofia");
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const { data } = await response.json() as { data: DigitalCredentialCandidateResponseDto[] };
    expect(data).toHaveLength(2);
    expect(data).toContainEqual(expect.objectContaining({ id: playerId, detail: "Equipo Real ID" }));
    expect((await (await searchFor("s")).json()).data).toEqual([]);
    expect((await (await searchFor("acuña")).json()).data).toHaveLength(20);
    expect((await (await searchFor("perez rene", "official")).json()).data).toContainEqual(expect.objectContaining({ source: "judge" }));
    expect((await (await searchFor("sofia", "official")).json()).data).toContainEqual(expect.objectContaining({ source: "coach", email }));
    currentUser.mockResolvedValue(null);
    expect((await searchFor("sofia")).status).toBe(403);
  });

  it("emite un solo ID concurrentemente, edita roles y lo vincula al verificar el correo", async () => {
    const db = getPrismaClient();
    const body = { ...person, email: email.toUpperCase(), roles: ["coach"] };
    const [first, second] = await Promise.all([issue(mutation("/issue-official", "POST", body)), issue(mutation("/issue-official", "POST", body))]);
    expect([first.status, second.status].sort()).toEqual([201, 409]);
    const { data: credential } = await (first.status === 201 ? first : second).json() as { data: DigitalCredentialResponseDto };
    expect(credential.roleLabel).toBe("Entrenador");
    expect(await db.digitalCredential.findUnique({ where: { id: credential.id } })).toMatchObject({ userId: null, claimEmail: email, judgeId: null });
    const params = Promise.resolve({ id: credential.id });
    const updateResponse = await update(mutation(`/${credential.id}`, "PATCH", {
      action: "set-roles", roles: ["coach", "judge", "player"], playerId,
    }), { params });
    expect(updateResponse.status).toBe(200);
    expect((await updateResponse.json()).data).toMatchObject({
      id: credential.id, publicId: credential.publicId, memberNumber: credential.memberNumber,
      expiresAt: credential.expiresAt, roleLabel: "Jugador · Juez · Entrenador",
    });
    const publiclyVerified = (await (await verifyId(credential.publicId)).json()).data;
    expect(publiclyVerified).toMatchObject({ status: "active", credential: { roleLabel: "Jugador · Juez · Entrenador" } });
    expect(publiclyVerified.credential).not.toHaveProperty("claimEmail");
    expect(publiclyVerified.credential).not.toHaveProperty("email");

    const users = RepositoryContainer.getUserRepository();
    const user = await db.user.create({ data: { id: `${prefix}-sofia`, email, name: person.displayName, passwordHash: "unused", isActive: false } });
    const other = await db.user.create({ data: { id: `${prefix}-other`, email: `${prefix}-other@example.com`, name: "Otra Persona", passwordHash: "unused", isActive: false } });
    const otpService = new OtpService(users, new PrismaAuxiliaryRepository());
    const otherOtp = await otpService.createRegistrationOtp((await users.findById(other.id))!);
    await otpService.verifyRegistrationOtp(otherOtp);
    expect(await db.digitalCredential.findUnique({ where: { id: credential.id } })).toMatchObject({ userId: null });

    const active = await users.updateActiveStatus(user.id, true);
    currentUser.mockResolvedValue(active);
    const myRequest = new NextRequest("http://localhost/api/digital-credentials/me");
    expect((await (await mine(myRequest)).json()).data).toBeNull();

    const otp = await otpService.createRegistrationOtp(active);
    const attempts = await Promise.allSettled([otpService.verifyRegistrationOtp(otp), otpService.verifyRegistrationOtp(otp)]);
    expect(attempts.map(({ status }) => status).sort()).toEqual(["fulfilled", "rejected"]);
    expect((await (await mine(myRequest)).json()).data).toMatchObject({ publicId: credential.publicId });
    expect(await db.digitalCredentialAudit.count({ where: { credentialId: credential.id, action: "linked_by_email" } })).toBe(1);

    currentUser.mockResolvedValue(admin);
    expect((await issuePlayer(mutation("/issue-player", "POST", { playerId }))).status).toBe(409);
    expect((await update(mutation(`/${credential.id}`, "PATCH", { action: "revoke" }), { params })).status).toBe(200);
    expect((await (await verifyId(credential.publicId)).json()).data).toEqual({ status: "revoked", credential: null });
  });

  it("vincula una cuenta existente seleccionada y distingue una credencial vencida", async () => {
    const db = getPrismaClient();
    const account = await db.user.create({ data: {
      id: `${prefix}-rene`, email: `${prefix}-rene@example.com`, name: "René Pérez", passwordHash: "unused",
    } });
    const response = await issue(mutation("/issue-official", "POST", {
      ...person, displayName: account.name, email: account.email, userId: account.id,
      judgeId: `${prefix}-judge`, roles: ["judge", "coach"],
    }));
    expect(response.status).toBe(201);
    const { data: credential } = await response.json() as { data: DigitalCredentialResponseDto };
    expect(credential.roleLabel).toBe("Juez · Entrenador");
    const record = await db.digitalCredential.update({ where: { id: credential.id }, data: { expiresAt: new Date(0) } });
    expect(record.userId).toBe(account.id);
    expect((await (await verifyId(credential.publicId)).json()).data).toEqual({ status: "expired", credential: null });
  });

  it("expone credenciales en conflicto sin cambiarlas", async () => {
    const db = getPrismaClient();
    const claimEmail = `${prefix}-conflict@example.com`;
    const records = await Promise.all([1, 2].map((suffix) => db.digitalCredential.create({ data: {
      claimEmail, subjectType: "official", displayName: "Conflicto de prueba", roleLabel: "Juez",
      organizationName: "LUFA", nationalityCode: "UY", dateOfBirth: new Date(person.dateOfBirth),
      expiresAt: new Date(Date.now() + 86_400_000), memberNumber: `${prefix}-conflict-${suffix}`,
    } })));
    const [first] = records;
    const response = await update(mutation(`/${first.id}`, "PATCH", { action: "set-roles", roles: ["coach"] }), {
      params: Promise.resolve({ id: first.id }),
    });
    expect(response.status).toBe(409);
    expect((await response.json()).data.credentials).toEqual(expect.arrayContaining(records.map(({ publicId }) =>
      expect.objectContaining({ publicId, status: "active", roleLabel: "Juez" }),
    )));
  });
});
