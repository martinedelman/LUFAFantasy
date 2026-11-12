import { NextRequest, NextResponse } from "next/server";
import type { IssuePlayerCredentialRequestDto } from "@lufa/contracts";
import { credentialTransaction, issueCredential, normalizeCredentialEmail, upsertMember } from "@lufa/database/repositories/digitalCredentials";
import {
  activeCredentialWhere, actorOf, adminCredentialError, checkedRoles, CredentialError, forbidden, parseNationality, readJson, rejectExistingCredential, requireAdmin,
} from "@/lib/adminDigitalCredential";
import { serializeCredentialById } from "@/lib/digitalCredential";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!actor) return forbidden();

    const body = await readJson<IssuePlayerCredentialRequestDto>(request);
    if (!body || typeof body.playerId !== "string" || !body.playerId.trim()) {
      throw new CredentialError("Seleccioná un jugador para emitir su ID digital.", 400);
    }
    const playerId = body.playerId;
    const roles = checkedRoles(body.roles === undefined ? ["player"] : body.roles, true);
    const requestedNationality = body.nationalityCode === undefined ? undefined : parseNationality(body.nationalityCode);
    const credential = await credentialTransaction(async (tx) => {
      const player = await tx.player.findUnique({ where: { id: playerId }, include: { team: { select: { name: true } } } });
      if (!player) throw new CredentialError("No encontramos la ficha del jugador seleccionado.", 404);

      const email = normalizeCredentialEmail(player.email ?? "");
      if (!email) throw new CredentialError("Completá el correo de la ficha antes de emitir la credencial.", 400);

      const accounts = await tx.user.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, isActive: true },
        take: 2,
      });
      rejectExistingCredential(await tx.digitalCredential.findMany({ where: activeCredentialWhere([{ playerId, email }]), select: { id: true } }));
      const [account] = accounts;
      if (accounts.length !== 1 || !account?.isActive) {
        throw new CredentialError("La ficha debe tener una cuenta LUFA activa vinculada a su correo.", 400);
      }
      const member = await upsertMember(tx, {
        userId: account.id, playerId, displayName: `${player.firstName} ${player.lastName}`.trim(),
        dateOfBirth: player.dateOfBirth, nationalityCode: requestedNationality ?? "UY", profilePicture: player.profilePicture,
      });
      if (member.playerId !== playerId) throw new CredentialError("Esta cuenta ya está vinculada a otra ficha de jugador.", 409);
      if (requestedNationality && member.nationalityCode !== requestedNationality) {
        await tx.member.update({ where: { id: member.id }, data: { nationalityCode: requestedNationality } });
      }
      rejectExistingCredential(await tx.digitalCredential.findMany({ where: activeCredentialWhere([{ memberId: member.id }]), select: { id: true } }));

      return issueCredential(tx, actorOf(actor), new Date().getUTCFullYear(), {
        memberId: member.id, userId: account.id, playerId, subjectType: "player", roles,
        displayName: member.displayName, profilePicture: player.profilePicture ?? member.profilePicture, organizationName: player.team.name,
        nationalityCode: requestedNationality ?? member.nationalityCode, dateOfBirth: player.dateOfBirth,
      });
    });
    return NextResponse.json({ success: true, data: await serializeCredentialById(credential.id) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos emitir la credencial de jugador.");
  }
}
