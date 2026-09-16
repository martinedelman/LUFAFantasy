import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { currentUserFromRequest } from "@/lib/currentUser";
import { apiErrorResponse } from "@/lib/apiError";
import { endOfCredentialSeason, serializeCredential } from "@/lib/digitalCredential";

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUserFromRequest(request);
    if (!actor?.isAdmin()) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 403 });

    const body = await request.json().catch(() => null) as { playerId?: unknown } | null;
    if (!body || typeof body.playerId !== "string" || !body.playerId.trim()) {
      return NextResponse.json({ success: false, message: "Seleccioná un jugador para emitir su ID digital." }, { status: 400 });
    }

    const db = getPrismaClient();
    const player = await db.player.findUnique({
      where: { id: body.playerId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        email: true,
        dateOfBirth: true,
        position: true,
        team: { select: { name: true } },
      },
    });
    if (!player) return NextResponse.json({ success: false, message: "No encontramos la ficha del jugador seleccionada." }, { status: 404 });
    if (!player.email?.trim()) {
      return NextResponse.json({ success: false, message: "La ficha no tiene un email asociado. Completalo antes de emitir la credencial." }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: { email: { equals: player.email.trim(), mode: "insensitive" } },
      select: { id: true, isActive: true },
    });
    if (!user || !user.isActive) {
      return NextResponse.json({
        success: false,
        message: "No hay una cuenta LUFA activa vinculada a esta ficha. La persona debe registrarse con el email de su ficha antes de emitir el ID.",
      }, { status: 400 });
    }

    const existing = await db.digitalCredential.findFirst({
      where: {
        OR: [{ playerId: player.id }, { userId: user.id }],
        status: "active",
        expiresAt: { gte: new Date() },
      },
      select: { memberNumber: true },
    });
    if (existing) {
      return NextResponse.json({ success: false, message: `Ya existe una credencial vigente (${existing.memberNumber}) para esta ficha.` }, { status: 409 });
    }

    const season = new Date().getUTCFullYear();
    const startOfSeason = new Date(Date.UTC(season, 0, 1));
    const startOfNextSeason = new Date(Date.UTC(season + 1, 0, 1));
    const count = await db.digitalCredential.count({ where: { issuedAt: { gte: startOfSeason, lt: startOfNextSeason } } });
    const credential = await db.digitalCredential.create({
      data: {
        userId: user.id,
        playerId: player.id,
        subjectType: "player",
        memberNumber: `LUFA-${season}-${String(count + 1).padStart(5, "0")}`,
        displayName: `${player.firstName} ${player.lastName}`.trim(),
        profilePicture: player.profilePicture,
        roleLabel: "Jugador",
        organizationName: player.team.name,
        nationalityCode: "UY",
        dateOfBirth: player.dateOfBirth,
        expiresAt: endOfCredentialSeason(season),
      },
    });
    await db.$transaction([
      db.digitalCredentialAudit.create({ data: { credentialId: credential.id, action: "issued" } }),
      db.adminAuditLog.create({
        data: {
          actorId: actor.id!,
          actorName: actor.name,
          actorEmail: actor.email,
          action: "digital_credential.issued",
          entityType: "digital_credential",
          entityId: credential.id,
          entityLabel: credential.memberNumber,
          summary: "Emitió una ID digital desde una ficha de jugador",
          before: {},
          after: { subjectType: "player" },
        },
      }),
    ]);

    return NextResponse.json({ success: true, data: serializeCredential(credential) }, { status: 201 });
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "No pudimos emitir la ID digital. Probá nuevamente en unos instantes.",
      status: 500,
      route: "/api/admin/digital-credentials/issue-player",
    });
  }
}
