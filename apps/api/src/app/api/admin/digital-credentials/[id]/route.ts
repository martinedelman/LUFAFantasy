import { NextRequest, NextResponse } from "next/server";
import { credentialTransaction, normalizeCredentialEmail } from "@lufa/database/repositories/digitalCredentials";
import { activeCredentialWhere, adminCredentialError, auditCredential, checkedRoleLabel, CredentialError, issueCredential, rejectExistingCredential } from "@/lib/adminDigitalCredential";
import { currentUserFromRequest } from "@/lib/currentUser";
import { credentialStatus, serializeCredential } from "@/lib/digitalCredential";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await currentUserFromRequest(request);
    if (!actor?.isAdmin()) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 403 });

    const { id } = await params;
    const body = await request.json().catch(() => null) as { action?: unknown; roles?: unknown; playerId?: unknown } | null;
    if (body?.action !== "revoke" && body?.action !== "renew" && body?.action !== "set-roles") {
      throw new CredentialError("Acción inválida.", 400);
    }
    const credential = await credentialTransaction(async (tx) => {
      const previous = await tx.digitalCredential.findUnique({
        where: { id },
        include: { user: { select: { email: true } } },
      });
      if (!previous) throw new CredentialError("Credencial no encontrada.", 404);

      if (body.action === "revoke") {
        if (previous.status !== "revoked") {
          const revoked = await tx.digitalCredential.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
          await auditCredential(tx, actor, revoked, "revoked", "Revocó una ID digital");
        }
        return null;
      }

      const email = normalizeCredentialEmail(previous.user?.email ?? previous.claimEmail ?? "");
      let playerId = previous.playerId;
      if (body.action === "set-roles" && body.playerId !== undefined && body.playerId !== playerId) {
        if (typeof body.playerId !== "string" || playerId) throw new CredentialError("La ficha de jugador no es válida para esta credencial.", 400);
        const player = await tx.player.findUnique({ where: { id: body.playerId }, select: { id: true, email: true } });
        if (!email || !player || normalizeCredentialEmail(player.email ?? "") !== email) {
          throw new CredentialError("La ficha de jugador debe corresponder al correo de la credencial.", 400);
        }
        playerId = player.id;
      }
      const activeWhere = activeCredentialWhere([{ userId: previous.userId, playerId, judgeId: previous.judgeId, email }]);
      const conflicts = await tx.digitalCredential.findMany({ where: { ...activeWhere, id: { not: id } } });
      rejectExistingCredential(conflicts.length ? [previous, ...conflicts] : []);

      if (body.action === "set-roles") {
        if (credentialStatus(previous) !== "active") throw new CredentialError("Solo podés editar una credencial vigente.", 409);
        const roleLabel = checkedRoleLabel(body.roles, Boolean(playerId) || previous.subjectType === "player");
        if (roleLabel === previous.roleLabel && playerId === previous.playerId) return previous;

        const updated = await tx.digitalCredential.update({ where: { id }, data: { roleLabel, playerId,
          subjectType: playerId ? "player" : previous.subjectType } });
        await auditCredential(tx, actor, updated, "roles_updated", "Actualizó los roles de una ID digital",
          { roleLabel: previous.roleLabel, playerId: previous.playerId }, { roleLabel, playerId });
        return updated;
      }

      if (await tx.digitalCredential.findFirst({ where: { renewedFromId: id }, select: { id: true } })) {
        throw new CredentialError("Esta credencial ya fue renovada.", 409);
      }
      const revoked = await tx.digitalCredential.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
      await auditCredential(tx, actor, revoked, "renewed", "Renovó una ID digital");
      return issueCredential(tx, actor, new Date().getUTCFullYear(), {
        userId: previous.userId, claimEmail: previous.claimEmail, playerId: previous.playerId, judgeId: previous.judgeId,
        subjectType: previous.subjectType, displayName: previous.displayName, profilePicture: previous.profilePicture,
        roleLabel: previous.roleLabel, organizationName: previous.organizationName, nationalityCode: previous.nationalityCode,
        dateOfBirth: previous.dateOfBirth, renewedFromId: id,
      });
    });
    return NextResponse.json(credential ? { success: true, data: serializeCredential(credential) } : { success: true });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos actualizar la credencial.");
  }
}
