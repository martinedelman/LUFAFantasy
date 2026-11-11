import { NextRequest, NextResponse } from "next/server";
import type { IssueOfficialCredentialRequestDto } from "@lufa/contracts";
import { credentialTransaction, issueCredential, normalizeCredentialEmail, upsertMember } from "@lufa/database/repositories/digitalCredentials";
import {
  activeCredentialWhere, actorOf, adminCredentialError, assignCoach, checkedRoles, CredentialError, forbidden, grantCertifications,
  parseCertifications, parseDateOnly, parseNationality, readJson, rejectExistingCredential, requireAdmin,
} from "@/lib/adminDigitalCredential";
import { serializeCredentialById } from "@/lib/digitalCredential";

export async function POST(request: NextRequest) {
  try {
    const actor = await requireAdmin(request);
    if (!actor) return forbidden();

    const body = await readJson<IssueOfficialCredentialRequestDto>(request);
    if (!body || typeof body.email !== "string" || typeof body.displayName !== "string" || !body.displayName.trim() ||
      typeof body.organizationName !== "string" || !body.organizationName.trim() ||
      (body.userId !== undefined && (typeof body.userId !== "string" || !body.userId)) ||
      (body.judgeId !== undefined && (typeof body.judgeId !== "string" || !body.judgeId)) ||
      (body.teamId !== undefined && (typeof body.teamId !== "string" || !body.teamId)) ||
      (body.profilePicture != null && typeof body.profilePicture !== "string")) {
      throw new CredentialError("Completá los datos obligatorios de la credencial.", 400);
    }
    const { userId, judgeId, teamId, displayName, organizationName, profilePicture } = body;
    const nationalityCode = parseNationality(body.nationalityCode);
    const email = normalizeCredentialEmail(body.email);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new CredentialError("Ingresá un correo electrónico válido.", 400);
    }
    const dateOfBirth = parseDateOnly(body.dateOfBirth, "Ingresá una fecha de nacimiento válida.");
    if (dateOfBirth > new Date()) throw new CredentialError("Ingresá una fecha de nacimiento válida.", 400);
    const roles = checkedRoles(body.roles, false);
    const certifications = parseCertifications(body.certifications, roles);
    if (teamId && !roles.includes("coach")) throw new CredentialError("Solo un entrenador puede vincularse a un equipo.", 400);

    const credential = await credentialTransaction(async (tx) => {
      if (judgeId && !await tx.judge.findUnique({ where: { id: judgeId }, select: { id: true } })) {
        throw new CredentialError("La ficha de juez ya no existe.", 404);
      }
      const accounts = await tx.user.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, isActive: true, emailVerifiedAt: true },
        take: 2,
      });
      const account = userId ? accounts.find((candidate) => candidate.id === userId) : accounts[0];
      if (accounts.length > 1 || (userId && !account?.isActive)) {
        throw new CredentialError("Revisá que el correo corresponda a una única cuenta LUFA y que la cuenta seleccionada esté activa.", 409);
      }
      rejectExistingCredential(await tx.digitalCredential.findMany({ where: activeCredentialWhere([{ userId: account?.id, judgeId, email }]), select: { id: true } }));
      const linkedUserId = account?.isActive && (userId || account.emailVerifiedAt) ? account.id : null;
      const member = await upsertMember(tx, {
        userId: linkedUserId, claimEmail: email, judgeId, displayName: displayName.trim(), dateOfBirth, nationalityCode,
        profilePicture: profilePicture || null,
      });
      rejectExistingCredential(await tx.digitalCredential.findMany({ where: activeCredentialWhere([{ memberId: member.id }]), select: { id: true } }));
      const issued = await issueCredential(tx, actorOf(actor), new Date().getUTCFullYear(), {
        memberId: member.id, userId: linkedUserId, claimEmail: email, judgeId, subjectType: "official", roles,
        displayName: displayName.trim(), organizationName: organizationName.trim(), nationalityCode, dateOfBirth,
        profilePicture: profilePicture || null,
      });
      await grantCertifications(tx, actor, issued, certifications);
      if (teamId) await assignCoach(tx, actor, issued, teamId, new Date().getUTCFullYear());
      return issued;
    });
    return NextResponse.json({ success: true, data: await serializeCredentialById(credential.id) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos emitir la credencial de oficial.");
  }
}
