import { NextRequest, NextResponse } from "next/server";
import type { UpdateDigitalCredentialRequestDto } from "@lufa/contracts";
import { auditCredential, credentialTransaction, issueCredential, normalizeCredentialEmail } from "@lufa/database/repositories/digitalCredentials";
import { credentialRoles, roleLabelFor } from "@lufa/database/repositories/digitalCredentialEvaluation";
import {
  activeCredentialWhere, actorOf, adminCredentialError, checkedRoles, CredentialError, forbidden, loadAdminDetail, parseNationality, readJson,
  rejectExistingCredential, requireAdmin,
} from "@/lib/adminDigitalCredential";
import { credentialStatus, serializeCredentialById } from "@/lib/digitalCredential";

type Params = { params: Promise<{ id: string }> };
const actions = new Set(["revoke", "renew", "set-roles", "suspend", "reinstate", "update-member"]);

export async function GET(request: NextRequest, { params }: Params) {
  try {
    if (!await requireAdmin(request)) return forbidden();
    const detail = await loadAdminDetail((await params).id);
    if (!detail) throw new CredentialError("Credencial no encontrada.", 404);
    return NextResponse.json({ success: true, data: detail }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos obtener la credencial.");
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const user = await requireAdmin(request);
    if (!user) return forbidden();
    const actor = actorOf(user);

    const { id } = await params;
    const body = await readJson<UpdateDigitalCredentialRequestDto & { roles: unknown; playerId: unknown; reason: unknown; nationalityCode: unknown }>(request);
    if (typeof body?.action !== "string" || !actions.has(body.action)) throw new CredentialError("Acción inválida.", 400);
    const credential = await credentialTransaction(async (tx) => {
      const previous = await tx.digitalCredential.findUnique({
        where: { id },
        include: { user: { select: { email: true } }, member: true },
      });
      if (!previous) throw new CredentialError("Credencial no encontrada.", 404);
      const { member } = previous;

      if (body.action === "revoke") {
        if (previous.status !== "revoked") {
          const revoked = await tx.digitalCredential.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
          await auditCredential(tx, actor, revoked, "revoked", "Revocó una ID digital");
        }
        return null;
      }

      if (body.action === "suspend") {
        const reason = typeof body.reason === "string" ? body.reason.trim().slice(0, 500) : "";
        if (!reason) throw new CredentialError("Indicá el motivo de la suspensión.", 400);
        await tx.member.update({ where: { id: member.id }, data: { status: "suspended", suspendedReason: reason, suspendedAt: new Date() } });
        await auditCredential(tx, actor, previous, "suspended", "Suspendió a un miembro LUFA", { status: member.status }, { status: "suspended", reason });
        return previous;
      }

      if (body.action === "reinstate") {
        if (member.status !== "suspended") return previous;
        await tx.member.update({ where: { id: member.id }, data: { status: "active", suspendedReason: null, suspendedAt: null } });
        await auditCredential(tx, actor, previous, "reinstated", "Levantó la suspensión de un miembro LUFA", { status: "suspended", reason: member.suspendedReason }, { status: "active" });
        return previous;
      }

      if (body.action === "update-member") {
        const nationalityCode = parseNationality(body.nationalityCode);
        if (nationalityCode === member.nationalityCode) return previous;
        await tx.member.update({ where: { id: member.id }, data: { nationalityCode } });
        await tx.digitalCredential.update({ where: { id }, data: { nationalityCode } });
        await auditCredential(tx, actor, previous, "member_updated", "Actualizó la nacionalidad de un miembro", { nationalityCode: member.nationalityCode }, { nationalityCode });
        return previous;
      }

      const email = normalizeCredentialEmail(previous.user?.email ?? previous.claimEmail ?? "");
      let playerId = previous.playerId;
      if (body.action === "set-roles" && body.playerId !== undefined && body.playerId !== playerId) {
        if (typeof body.playerId !== "string" || playerId) throw new CredentialError("La ficha de jugador no es válida para esta credencial.", 400);
        const player = await tx.player.findUnique({ where: { id: body.playerId }, select: { id: true, email: true, lufaMember: { select: { id: true } } } });
        if (!email || !player || normalizeCredentialEmail(player.email ?? "") !== email) {
          throw new CredentialError("La ficha de jugador debe corresponder al correo de la credencial.", 400);
        }
        if (player.lufaMember && player.lufaMember.id !== member.id) throw new CredentialError("Esa ficha ya pertenece a otro miembro LUFA.", 409);
        playerId = player.id;
      }
      const activeWhere = activeCredentialWhere([{ memberId: member.id, userId: previous.userId, playerId, judgeId: previous.judgeId, email }]);
      const conflicts = await tx.digitalCredential.findMany({ where: { ...activeWhere, id: { not: id } }, select: { id: true } });
      rejectExistingCredential(conflicts.length ? [previous, ...conflicts] : []);

      if (body.action === "set-roles") {
        if (credentialStatus(previous) !== "active") throw new CredentialError("Solo podés editar una credencial vigente.", 409);
        const roles = checkedRoles(body.roles, Boolean(playerId) || previous.subjectType === "player");
        const previousRoles = credentialRoles(previous);
        if (roles.join() === previousRoles.join() && playerId === previous.playerId) return previous;

        if (playerId && !member.playerId) await tx.member.update({ where: { id: member.id }, data: { playerId } });
        const updated = await tx.digitalCredential.update({ where: { id }, data: { roles, roleLabel: roleLabelFor(roles), playerId,
          subjectType: playerId ? "player" : previous.subjectType } });
        await auditCredential(tx, actor, updated, "roles_updated", "Actualizó los roles de una ID digital",
          { roles: previousRoles, playerId: previous.playerId }, { roles, playerId });
        return updated;
      }

      if (member.status === "suspended") throw new CredentialError("El miembro está suspendido. Levantá la suspensión antes de renovar.", 409);
      if (await tx.digitalCredential.findFirst({ where: { renewedFromId: id }, select: { id: true } })) {
        throw new CredentialError("Esta credencial ya fue renovada.", 409);
      }
      const revoked = await tx.digitalCredential.update({ where: { id }, data: { status: "revoked", revokedAt: new Date() } });
      await auditCredential(tx, actor, revoked, "renewed", "Renovó una ID digital");
      return issueCredential(tx, actor, new Date().getUTCFullYear(), {
        memberId: member.id, userId: previous.userId ?? member.userId, claimEmail: previous.claimEmail, playerId: previous.playerId,
        judgeId: previous.judgeId, subjectType: previous.subjectType, displayName: previous.displayName, profilePicture: previous.profilePicture,
        roles: credentialRoles(previous), organizationName: previous.organizationName, nationalityCode: member.nationalityCode,
        dateOfBirth: previous.dateOfBirth, renewedFromId: id,
      });
    });
    return NextResponse.json(credential ? { success: true, data: await serializeCredentialById(credential.id) } : { success: true });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos actualizar la credencial.");
  }
}
