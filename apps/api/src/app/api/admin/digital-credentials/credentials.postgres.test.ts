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
import { PrismaCommerceRepository } from "@lufa/database/repositories/commerce";
import { POST as recordMembership } from "./[id]/memberships/route";
import { PATCH as updateMembership } from "./[id]/memberships/[periodId]/route";
import { GET as detail } from "./[id]/route";
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

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- respuestas JSON de prueba, se validan con expect.
function json<T = any>(response: Response) {
  return response.json() as Promise<{ success: boolean; data: T; message?: string }>;
}

async function removeFixtures() {
  const db = getPrismaClient();
  const members = await db.member.findMany({ where: {
    OR: [{ claimEmail: { startsWith: prefix } }, { userId: { startsWith: prefix } }, { player: { teamId } }, { judgeId: `${prefix}-judge` }],
  }, select: { id: true } });
  const memberIds = members.map(({ id }) => id);
  const credentials = await db.digitalCredential.findMany({ where: {
    OR: [{ claimEmail: { startsWith: prefix } }, { player: { teamId } }, { judgeId: `${prefix}-judge` }, { memberId: { in: memberIds } }],
  }, select: { id: true } });
  const ids = credentials.map(({ id }) => id);
  await db.digitalCredentialAudit.deleteMany({ where: { credentialId: { in: ids } } });
  await db.adminAuditLog.deleteMany({ where: { actorId: admin.id } });
  await db.digitalCredential.deleteMany({ where: { id: { in: ids } } });
  await db.member.deleteMany({ where: { id: { in: memberIds } } });
  await db.commerceTournamentRegistration.deleteMany({ where: { userId: { startsWith: prefix } } });
  await db.commerceOrderItem.deleteMany({ where: { order: { buyerUserId: { startsWith: prefix } } } });
  await db.commerceOrder.deleteMany({ where: { buyerUserId: { startsWith: prefix } } });
  await db.commerceItem.deleteMany({ where: { sellerId: `${prefix}-seller` } });
  await db.commerceSeller.deleteMany({ where: { id: `${prefix}-seller` } });
  await db.tournament.deleteMany({ where: { id: `${prefix}-tournament` } });
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
    // Tarjeta vigente pero sin membresía paga ni certificaciones: se muestra quién es, sin habilitarla.
    expect(publiclyVerified).toMatchObject({ status: "inactive", credential: { roleLabel: "Jugador · Juez · Entrenador", lufaNumber: expect.stringMatching(/^LUFA-\d{6}$/) } });
    expect(publiclyVerified.credential.roles.map((role: { status: string }) => role.status)).toEqual(["membership_required", "certification_required", "certification_required"]);
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
    expect((await (await verifyId(credential.publicId)).json()).data).toMatchObject({ status: "revoked", credential: null });
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
    expect((await (await verifyId(credential.publicId)).json()).data).toMatchObject({ status: "expired", credential: null });
  });

  it("expone credenciales en conflicto sin cambiarlas", async () => {
    const db = getPrismaClient();
    const claimEmail = `${prefix}-conflict@example.com`;
    const member = await db.member.create({ data: { claimEmail, displayName: "Conflicto de prueba", dateOfBirth: new Date(person.dateOfBirth), nationalityCode: "UY" } });
    const records = await Promise.all([1, 2].map((suffix) => db.digitalCredential.create({ data: {
      memberId: member.id, claimEmail, subjectType: "official", displayName: "Conflicto de prueba", roleLabel: "Juez",
      organizationName: "LUFA", nationalityCode: "UY", dateOfBirth: new Date(person.dateOfBirth),
      expiresAt: new Date(Date.now() + 86_400_000), memberNumber: `${prefix}-conflict-${suffix}`,
    } })));
    const [first] = records;
    const response = await update(mutation(`/${first.id}`, "PATCH", { action: "set-roles", roles: ["coach"] }), {
      params: Promise.resolve({ id: first.id }),
    });
    expect(response.status).toBe(409);
    expect((await response.json()).data.credentials).toEqual(expect.arrayContaining(records.map(({ publicId }) =>
      expect.objectContaining({ publicId, cardStatus: "active", roleLabel: "Juez" }),
    )));
  });
  it("la membresía offline habilita al jugador y anularla lo deshabilita", async () => {
    const db = getPrismaClient();
    const account = await db.user.create({ data: { id: `${prefix}-lucia`, email: `${prefix}-lucia@example.com`, name: "Lucía Paz", passwordHash: "unused", isActive: true } });
    const player = await db.player.create({ data: { teamId, firstName: "Lucía", lastName: "Paz", email: account.email, dateOfBirth: new Date("2001-02-03"), position: "WR", registrationDate: new Date() } });
    const issued = await issuePlayer(mutation("/issue-player", "POST", { playerId: player.id, nationalityCode: "AR" }));
    expect(issued.status).toBe(201);
    const { data: credential } = await json<DigitalCredentialResponseDto>(issued);
    expect(credential).toMatchObject({ status: "inactive", nationalityCode: "AR", organizationName: "Equipo Real ID" });
    expect(credential.publicId).toMatch(/^[A-Za-z0-9_-]{22}$/);
    const params = Promise.resolve({ id: credential.id });

    expect((await recordMembership(mutation(`/${credential.id}/memberships`, "POST", { method: "cash" }), { params })).status).toBe(400);
    const recorded = await recordMembership(mutation(`/${credential.id}/memberships`, "POST", { method: "transfer", months: 12, reference: "Transferencia 123", amountMinor: 150000 }), { params });
    expect(recorded.status).toBe(201);
    const { data: withMembership } = await json(recorded);
    expect(withMembership.credential.status).toBe("active");
    expect(withMembership.memberships).toEqual([expect.objectContaining({ source: "offline", method: "transfer", status: "active", reference: "Transferencia 123" })]);
    expect((await json(await verifyId(credential.publicId))).data).toMatchObject({ status: "active", credential: { roles: [{ role: "player", status: "valid", teams: ["Equipo Real ID"] }] } });

    // Si la ficha pasa a otro equipo, la verificación muestra el equipo actual, no el de la emisión.
    await db.team.update({ where: { id: teamId }, data: { name: "Equipo Real ID Renombrado" } });
    expect((await json(await verifyId(credential.publicId))).data.credential.organizationName).toBe("Equipo Real ID Renombrado");
    await db.team.update({ where: { id: teamId }, data: { name: "Equipo Real ID" } });

    const periodId = withMembership.memberships[0].id;
    const periodParams = Promise.resolve({ id: credential.id, periodId });
    expect((await updateMembership(mutation(`/${credential.id}/memberships/${periodId}`, "PATCH", { action: "void" }), { params: periodParams })).status).toBe(400);
    expect((await updateMembership(mutation(`/${credential.id}/memberships/${periodId}`, "PATCH", { action: "void", reason: "Transferencia rechazada" }), { params: periodParams })).status).toBe(200);
    expect((await json(await verifyId(credential.publicId))).data.status).toBe("inactive");

    // La suspensión bloquea todo, y ningún pago la levanta.
    await recordMembership(mutation(`/${credential.id}/memberships`, "POST", { method: "cash", months: 6 }), { params });
    expect((await update(mutation(`/${credential.id}`, "PATCH", { action: "suspend" }), { params })).status).toBe(400);
    expect((await update(mutation(`/${credential.id}`, "PATCH", { action: "suspend", reason: "Sanción disciplinaria" }), { params })).status).toBe(200);
    expect((await json(await verifyId(credential.publicId))).data).toMatchObject({ status: "suspended", credential: null });
    expect((await update(mutation(`/${credential.id}`, "PATCH", { action: "renew" }), { params })).status).toBe(409);
    expect((await update(mutation(`/${credential.id}`, "PATCH", { action: "reinstate" }), { params })).status).toBe(200);
    expect((await json(await detail(new NextRequest(`${base}/${credential.id}`), { params }))).data).toMatchObject({ suspendedReason: null, credential: { status: "active" } });
  });

  it("la tienda no reactiva una ID revocada, el reembolso anula la membresía y nunca adivina la ficha", async () => {
    const db = getPrismaClient();
    const commerce = new PrismaCommerceRepository();
    const buyer = await db.user.create({ data: { id: `${prefix}-mateo`, email: `${prefix}-mateo@example.com`, name: "Mateo Ruiz", passwordHash: "unused", isActive: true } });
    const player = await db.player.create({ data: { teamId, firstName: "Mateo", lastName: "Ruiz", email: buyer.email, dateOfBirth: new Date("1999-09-09"), position: "QB", registrationDate: new Date() } });
    await db.tournament.create({ data: { id: `${prefix}-tournament`, name: "Torneo Real ID", season: "2026", year: 2026, startDate: new Date(), endDate: new Date(Date.now() + 90 * 86_400_000), status: "upcoming" } });
    await db.commerceSeller.create({ data: { id: `${prefix}-seller`, slug: `${prefix}-seller`, name: "LUFA", kind: "lufa" } });
    const item = await db.commerceItem.create({ data: {
      sellerId: `${prefix}-seller`, tournamentId: `${prefix}-tournament`, slug: `${prefix}-inscripcion`, kind: "tournament", title: "Inscripción",
      description: "Incluye Mi ID", priceMinor: 100000, entitlementMonths: 6, details: { divisionId: `${prefix}-division` },
    } });
    let orderNumber = 0;
    async function paidOrder(buyerUserId: string) {
      orderNumber += 1;
      const order = await db.commerceOrder.create({ data: {
        buyerUserId, sellerId: `${prefix}-seller`, subtotalMinor: 100000, totalMinor: 100000, idempotencyKey: `${prefix}-order-${orderNumber}`,
        payloadFingerprint: "fp", providerOrderId: `${prefix}-provider-${orderNumber}`, liveMode: false, reservationExpiresAt: new Date(Date.now() + 600_000),
        status: "payment_pending", items: { create: [{ itemId: item.id, title: item.title, kind: "tournament", quantity: 1, unitPriceMinor: 100000, entitlementMonths: 6 }] },
      } });
      const provider = (status: string) => ({
        id: order.providerOrderId!, externalReference: order.id, status, currency: "UYU", totalMinor: 100000, collectorId: "c", applicationId: "a",
        checkoutUrl: null, paidAt: new Date(), paymentMethodId: null, paymentMethodType: null, paymentInstallments: null, paymentInstallmentAmountMinor: null,
      });
      return { order, pay: () => commerce.reconcileOrder(order.id, provider("processed")), refund: () => commerce.reconcileOrder(order.id, provider("refunded")) };
    }

    // Primera compra: emite la ID por la vía oficial (número de temporada, membresía de 6 meses).
    const first = await paidOrder(buyer.id);
    await first.pay();
    const member = await db.member.findUniqueOrThrow({ where: { userId: buyer.id }, include: { credentials: true, memberships: true } });
    expect(member).toMatchObject({ playerId: player.id, credentials: [expect.objectContaining({ status: "active", memberNumber: expect.stringMatching(/^LUFA-\d{4}-\d{5}$/), roles: ["player"] })] });
    expect(member.memberships).toEqual([expect.objectContaining({ source: "store_order", orderId: first.order.id, status: "active" })]);
    await db.player.update({ where: { id: player.id }, data: { status: "active" } });
    const [credential] = member.credentials;
    expect((await json(await verifyId(credential!.publicId))).data.status).toBe("active");

    // Un reembolso anula la membresía pagada por esa orden.
    await first.refund();
    expect(await db.membershipPeriod.findFirst({ where: { orderId: first.order.id } })).toMatchObject({ status: "voided", voidReason: "Orden reembolsada" });
    expect((await json(await verifyId(credential!.publicId))).data.status).toBe("inactive");

    // Regresión: pagar después de una revocación ya no reactiva la ID ni emite otra.
    await update(mutation(`/${credential!.id}`, "PATCH", { action: "revoke" }), { params: Promise.resolve({ id: credential!.id }) });
    await (await paidOrder(buyer.id)).pay();
    const after = await db.digitalCredential.findMany({ where: { memberId: member.id } });
    expect(after).toEqual([expect.objectContaining({ id: credential!.id, status: "revoked" })]);
    expect((await json(await verifyId(credential!.publicId))).data.status).toBe("revoked");

    // Dos fichas con el mismo correo (p. ej. hermanos con el correo de un padre): la tienda no elige una al azar.
    const parent = await db.user.create({ data: { id: `${prefix}-padre`, email: `${prefix}-familia@example.com`, name: "Familia", passwordHash: "unused", isActive: true } });
    await db.player.createMany({ data: ["Hijo", "Hija"].map((firstName) => ({ teamId, firstName, lastName: "Familia", email: parent.email, dateOfBirth: new Date("2012-01-01"), position: "WR", registrationDate: new Date() })) });
    await expect((await paidOrder(parent.id)).pay()).rejects.toMatchObject({ code: "PLAYER_PROFILE_AMBIGUOUS" });
    expect(await db.member.findUnique({ where: { userId: parent.id } })).toBeNull();
  });
});
