import { NextRequest, NextResponse } from "next/server";
import type { IssueOfficialCredentialRequestDto } from "@lufa/contracts";
import { credentialTransaction, normalizeCredentialEmail } from "@lufa/database/repositories/digitalCredentials";
import { activeCredentialWhere, adminCredentialError, checkedRoleLabel, CredentialError, issueCredential, rejectExistingCredential } from "@/lib/adminDigitalCredential";
import { currentUserFromRequest } from "@/lib/currentUser";
import { serializeCredential } from "@/lib/digitalCredential";

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUserFromRequest(request);
    if (!actor?.isAdmin()) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 403 });

    const body = await request.json().catch(() => null) as Partial<IssueOfficialCredentialRequestDto> | null;
    if (!body || typeof body.email !== "string" || typeof body.displayName !== "string" || !body.displayName.trim() ||
      typeof body.organizationName !== "string" || !body.organizationName.trim() ||
      typeof body.nationalityCode !== "string" || !/^[A-Z]{2}$/.test(body.nationalityCode) ||
      typeof body.dateOfBirth !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(body.dateOfBirth) ||
      (body.userId !== undefined && (typeof body.userId !== "string" || !body.userId)) ||
      (body.judgeId !== undefined && (typeof body.judgeId !== "string" || !body.judgeId)) ||
      (body.profilePicture != null && typeof body.profilePicture !== "string")) {
      throw new CredentialError("Completá los datos obligatorios de la credencial.", 400);
    }
    const { userId, judgeId, displayName, organizationName, nationalityCode, profilePicture } = body;
    const email = normalizeCredentialEmail(body.email);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new CredentialError("Ingresá un correo electrónico válido.", 400);
    }
    const dateOfBirth = new Date(`${body.dateOfBirth}T00:00:00Z`);
    if (!Number.isFinite(dateOfBirth.getTime()) || dateOfBirth.toISOString().slice(0, 10) !== body.dateOfBirth || dateOfBirth > new Date()) {
      throw new CredentialError("Ingresá una fecha de nacimiento válida.", 400);
    }
    const roleLabel = checkedRoleLabel(body.roles, false);

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
      rejectExistingCredential(await tx.digitalCredential.findMany({ where: activeCredentialWhere([{ userId: account?.id, judgeId, email }]) }));
      const linkedUserId = account?.isActive && (userId || account.emailVerifiedAt) ? account.id : null;
      return issueCredential(tx, actor, new Date().getUTCFullYear(), {
        userId: linkedUserId, claimEmail: email, judgeId, subjectType: "official", roleLabel,
        displayName: displayName.trim(), organizationName: organizationName.trim(), nationalityCode, dateOfBirth,
        profilePicture: profilePicture || null,
      });
    });
    return NextResponse.json({ success: true, data: serializeCredential(credential) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos emitir la credencial de oficial.");
  }
}
