import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import type { CreateDigitalCredentialRequestDto } from "@lufa/contracts";
import { currentUserFromRequest } from "@/lib/currentUser";
import { endOfCredentialSeason, serializeCredential } from "@/lib/digitalCredential";
import { apiErrorResponse } from "@/lib/apiError";

async function admin(request: NextRequest) {
  const user = await currentUserFromRequest(request);
  return user?.isAdmin() ? user : null;
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("es-UY")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesPlayerName(firstName: string, lastName: string, query: string) {
  const fullName = normalizeSearch(`${firstName} ${lastName}`);
  return normalizeSearch(query)
    .split(" ")
    .filter(Boolean)
    .every((term) => fullName.includes(term));
}

export async function GET(request: NextRequest) {
  try {
    if (!await admin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    const search = new URL(request.url).searchParams.get("search")?.trim() || "";
    const db = getPrismaClient();
    const [credentials, players] = await Promise.all([
      db.digitalCredential.findMany({ orderBy: { issuedAt: "desc" }, take: 40 }),
      search.length >= 2
        ? db.player.findMany({
            select: {
              id: true,
              firstName: true,
              lastName: true,
              profilePicture: true,
              email: true,
              dateOfBirth: true,
              position: true,
              status: true,
              team: { select: { name: true } },
            },
            orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
            take: 300,
          })
        : Promise.resolve([]),
    ]);

    const matchingPlayers = players
      .filter((player) => matchesPlayerName(player.firstName, player.lastName, search))
      .slice(0, 20);
    const playerEmails = [...new Set(matchingPlayers.map((player) => player.email?.trim()).filter((email): email is string => Boolean(email)))];
    const playerIds = matchingPlayers.map((player) => player.id);
    const [accounts, activeCredentials] = await Promise.all([
      playerEmails.length > 0
        ? db.user.findMany({
            where: {
              OR: playerEmails.map((email) => ({
                email: { equals: email, mode: "insensitive" },
              })),
            },
            select: { id: true, name: true, email: true, isActive: true },
          })
        : Promise.resolve([]),
      playerIds.length > 0
        ? db.digitalCredential.findMany({
            where: { playerId: { in: playerIds }, status: "active", expiresAt: { gte: new Date() } },
            orderBy: { issuedAt: "desc" },
          })
        : Promise.resolve([]),
    ]);
    const accountByEmail = new Map(accounts.map((account) => [normalizeSearch(account.email), account]));
    const credentialByPlayerId = new Map<string, (typeof activeCredentials)[number]>();
    for (const credential of activeCredentials) {
      if (credential.playerId && !credentialByPlayerId.has(credential.playerId)) credentialByPlayerId.set(credential.playerId, credential);
    }

    const playerCandidates = matchingPlayers.map((player) => {
      const account = player.email ? accountByEmail.get(normalizeSearch(player.email)) || null : null;
      const credential = credentialByPlayerId.get(player.id);
      return {
        id: player.id,
        fullName: `${player.firstName} ${player.lastName}`,
        teamName: player.team.name,
        position: player.position,
        playerStatus: player.status,
        account: account ? { id: account.id, name: account.name, email: account.email, isActive: account.isActive } : null,
        activeCredential: credential ? serializeCredential(credential) : null,
      };
    });

    return NextResponse.json({ success: true, data: { credentials: credentials.map(serializeCredential), playerCandidates } });
  } catch (error) { return apiErrorResponse({ request, error, message: "No pudimos obtener las credenciales.", status: 500, route: "/api/admin/digital-credentials" }); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await admin(request);
    if (!actor) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    const body = await request.json().catch(() => null) as CreateDigitalCredentialRequestDto | null;
    if (!body || !body.userId || !body.displayName?.trim() || !body.roleLabel?.trim() || !body.organizationName?.trim() || !/^[A-Z]{2}$/.test(body.nationalityCode || "") || !Number.isInteger(body.season)) {
      return NextResponse.json({ success: false, message: "Completá todos los datos obligatorios de la credencial." }, { status: 400 });
    }
    const dateOfBirth = new Date(body.dateOfBirth);
    if (Number.isNaN(dateOfBirth.getTime()) || (body.subjectType !== "player" && body.subjectType !== "official") || (body.subjectType === "player" ? !body.playerId || body.judgeId : !body.judgeId || body.playerId)) {
      return NextResponse.json({ success: false, message: "La identidad vinculada no es válida." }, { status: 400 });
    }
    const db = getPrismaClient();
    const [user, subject] = await Promise.all([db.user.findUnique({ where: { id: body.userId } }), body.subjectType === "player" ? db.player.findUnique({ where: { id: body.playerId } }) : db.judge.findUnique({ where: { id: body.judgeId } })]);
    if (!user || !subject) return NextResponse.json({ success: false, message: "La cuenta o la ficha seleccionada no existen." }, { status: 400 });
    const existing = await db.digitalCredential.findFirst({ where: { userId: body.userId, status: "active", expiresAt: { gte: new Date() } } });
    if (existing) return NextResponse.json({ success: false, message: "Esta cuenta ya tiene una credencial vigente." }, { status: 409 });
    const count = await db.digitalCredential.count({ where: { issuedAt: { gte: new Date(Date.UTC(body.season, 0, 1)), lt: new Date(Date.UTC(body.season + 1, 0, 1)) } } });
    const credential = await db.digitalCredential.create({ data: { userId: body.userId, playerId: body.playerId || null, judgeId: body.judgeId || null, subjectType: body.subjectType, memberNumber: `LUFA-${body.season}-${String(count + 1).padStart(5, "0")}`, displayName: body.displayName.trim(), profilePicture: body.profilePicture || null, roleLabel: body.roleLabel.trim(), organizationName: body.organizationName.trim(), nationalityCode: body.nationalityCode, dateOfBirth, expiresAt: endOfCredentialSeason(body.season) } });
    await db.digitalCredentialAudit.create({ data: { credentialId: credential.id, action: "issued" } });
    await db.adminAuditLog.create({ data: { actorId: actor.id!, actorName: actor.name, actorEmail: actor.email, action: "digital_credential.issued", entityType: "digital_credential", entityId: credential.id, entityLabel: credential.memberNumber, summary: "Emitió una ID digital", before: {}, after: {} } });
    return NextResponse.json({ success: true, data: serializeCredential(credential) }, { status: 201 });
  } catch (error) { return apiErrorResponse({ request, error, message: "No pudimos emitir la credencial.", status: 500, route: "/api/admin/digital-credentials" }); }
}
