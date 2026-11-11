import { NextRequest, NextResponse } from "next/server";
import type { UpdateCertificationRequestDto } from "@lufa/contracts";
import { auditCredential, credentialTransaction } from "@lufa/database/repositories/digitalCredentials";
import { actorOf, adminCredentialError, credentialForMember, CredentialError, forbidden, loadAdminDetail, readJson, requireAdmin } from "@/lib/adminDigitalCredential";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; certificationId: string }> }) {
  try {
    const user = await requireAdmin(request);
    if (!user) return forbidden();
    const { id, certificationId } = await params;
    const body = await readJson<UpdateCertificationRequestDto>(request);
    if (body?.action !== "revoke") throw new CredentialError("Acción inválida.", 400);
    await credentialTransaction(async (tx) => {
      const credential = await credentialForMember(tx, id);
      const certification = await tx.memberCertification.findFirst({ where: { id: certificationId, memberId: credential.memberId } });
      if (!certification) throw new CredentialError("Certificación no encontrada.", 404);
      if (certification.status === "revoked") return;
      await tx.memberCertification.update({ where: { id: certificationId }, data: { status: "revoked", revokedAt: new Date() } });
      await auditCredential(tx, actorOf(user), credential, "certification_revoked", "Revocó una certificación",
        { certificationId, role: certification.role, level: certification.level, status: "active" }, { status: "revoked" });
    });
    return NextResponse.json({ success: true, data: await loadAdminDetail(id) });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos revocar la certificación.");
  }
}
