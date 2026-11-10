import { NextRequest, NextResponse } from "next/server";
import type { CreateCoachAssignmentRequestDto } from "@lufa/contracts";
import { credentialTransaction } from "@lufa/database/repositories/digitalCredentials";
import { credentialRoles } from "@lufa/database/repositories/digitalCredentialEvaluation";
import { adminCredentialError, assignCoach, credentialForMember, CredentialError, forbidden, loadAdminDetail, readJson, requireAdmin } from "@/lib/adminDigitalCredential";

/** Vincula al entrenador con un equipo para una temporada; la verificación muestra los equipos vigentes. */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request);
    if (!user) return forbidden();
    const { id } = await params;
    const body = await readJson<CreateCoachAssignmentRequestDto>(request);
    if (!body || typeof body.teamId !== "string" || !body.teamId) throw new CredentialError("Seleccioná un equipo.", 400);
    const season = body.season ?? new Date().getUTCFullYear();
    if (!Number.isInteger(season) || season < 2000 || season > 2100) throw new CredentialError("La temporada no es válida.", 400);
    if (body.role !== undefined && body.role !== "head" && body.role !== "assistant") throw new CredentialError("El rol en el equipo no es válido.", 400);
    await credentialTransaction(async (tx) => {
      const credential = await credentialForMember(tx, id);
      const record = await tx.digitalCredential.findUniqueOrThrow({ where: { id }, select: { roles: true, roleLabel: true, subjectType: true } });
      if (!credentialRoles(record).includes("coach")) throw new CredentialError("Primero agregá el rol de entrenador a la credencial.", 400);
      await assignCoach(tx, user, credential, body.teamId!, season, body.role);
    });
    return NextResponse.json({ success: true, data: await loadAdminDetail(id) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos vincular al entrenador.");
  }
}
