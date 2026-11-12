import { NextRequest, NextResponse } from "next/server";
import type { CertificationInputDto } from "@lufa/contracts";
import { credentialTransaction } from "@lufa/database/repositories/digitalCredentials";
import { credentialRoles } from "@lufa/database/repositories/digitalCredentialEvaluation";
import { adminCredentialError, credentialForMember, CredentialError, forbidden, grantCertifications, loadAdminDetail, parseCertifications, readJson, requireAdmin } from "@/lib/adminDigitalCredential";

/** Otorga o renueva la certificación (nivel + vencimiento) de entrenador o juez. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request);
    if (!user) return forbidden();
    const { id } = await params;
    const body = await readJson<CertificationInputDto>(request);
    await credentialTransaction(async (tx) => {
      const credential = await credentialForMember(tx, id);
      const record = await tx.digitalCredential.findUniqueOrThrow({ where: { id }, select: { roles: true, roleLabel: true, subjectType: true } });
      const roles = credentialRoles(record);
      if (body?.role && !roles.includes(body.role)) throw new CredentialError("Primero agregá ese rol a la credencial.", 400);
      await grantCertifications(tx, user, credential, parseCertifications([body], roles));
    });
    return NextResponse.json({ success: true, data: await loadAdminDetail(id) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos otorgar la certificación.");
  }
}
