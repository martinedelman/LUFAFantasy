import { NextRequest, NextResponse } from "next/server";
import type { UpdateCoachAssignmentRequestDto } from "@lufa/contracts";
import { auditCredential, credentialTransaction } from "@lufa/database/repositories/digitalCredentials";
import { actorOf, adminCredentialError, credentialForMember, CredentialError, forbidden, loadAdminDetail, readJson, requireAdmin } from "@/lib/adminDigitalCredential";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; assignmentId: string }> }) {
  try {
    const user = await requireAdmin(request);
    if (!user) return forbidden();
    const { id, assignmentId } = await params;
    const body = await readJson<UpdateCoachAssignmentRequestDto>(request);
    if (typeof body?.active !== "boolean") throw new CredentialError("Acción inválida.", 400);
    await credentialTransaction(async (tx) => {
      const credential = await credentialForMember(tx, id);
      const assignment = await tx.coachAssignment.findFirst({ where: { id: assignmentId, memberId: credential.memberId } });
      if (!assignment) throw new CredentialError("Vínculo con el equipo no encontrado.", 404);
      if (assignment.active === body.active) return;
      await tx.coachAssignment.update({ where: { id: assignmentId }, data: { active: body.active } });
      await auditCredential(tx, actorOf(user), credential, body.active ? "coach_assigned" : "coach_unassigned",
        body.active ? "Reactivó el vínculo del entrenador con un equipo" : "Desvinculó al entrenador de un equipo",
        { assignmentId, active: assignment.active }, { active: body.active });
    });
    return NextResponse.json({ success: true, data: await loadAdminDetail(id) });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos actualizar el vínculo del entrenador.");
  }
}
