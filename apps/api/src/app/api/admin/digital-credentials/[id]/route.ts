import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { currentUserFromRequest } from "@/lib/currentUser";
import { apiErrorResponse } from "@/lib/apiError";
import { endOfCredentialSeason, serializeCredential } from "@/lib/digitalCredential";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUserFromRequest(request);
    if (!actor?.isAdmin()) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    const { id } = await params;
    const body = await request.json().catch(() => null) as { action?: unknown } | null;
    if (body?.action !== "revoke" && body?.action !== "renew") return NextResponse.json({ success: false, message: "Acción inválida." }, { status: 400 });
    const db = getPrismaClient();
    if (body.action === "renew") {
      const previous = await db.digitalCredential.findUnique({ where: { id } });
      if (!previous) return NextResponse.json({ success: false, message: "Credencial no encontrada." }, { status: 404 });
      const season = new Date().getUTCFullYear();
      const count = await db.digitalCredential.count({ where: { issuedAt: { gte: new Date(Date.UTC(season, 0, 1)), lt: new Date(Date.UTC(season + 1, 0, 1)) } } });
      const credential = await db.$transaction(async (tx) => {
        await tx.digitalCredential.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
        return tx.digitalCredential.create({ data: { userId: previous.userId, playerId: previous.playerId, judgeId: previous.judgeId, subjectType: previous.subjectType, memberNumber: `LUFA-${season}-${String(count + 1).padStart(5, "0")}`, displayName: previous.displayName, profilePicture: previous.profilePicture, roleLabel: previous.roleLabel, organizationName: previous.organizationName, nationalityCode: previous.nationalityCode, dateOfBirth: previous.dateOfBirth, expiresAt: endOfCredentialSeason(season), renewedFromId: previous.id } });
      });
      await db.digitalCredentialAudit.createMany({ data: [{ credentialId: id, action: "renewed" }, { credentialId: credential.id, action: "issued" }] });
      return NextResponse.json({ success: true, data: serializeCredential(credential) });
    }
    const credential = await db.digitalCredential.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
    await db.digitalCredentialAudit.create({ data: { credentialId: id, action: "revoked" } });
    await db.adminAuditLog.create({ data: { actorId: actor.id!, actorName: actor.name, actorEmail: actor.email, action: "digital_credential.revoked", entityType: "digital_credential", entityId: id, entityLabel: credential.memberNumber, summary: "Revocó una ID digital", before: {}, after: {} } });
    return NextResponse.json({ success: true });
  } catch (error) { return apiErrorResponse({ request, error, message: "No pudimos revocar la credencial.", status: 500, route: "/api/admin/digital-credentials/[id]" }); }
}
