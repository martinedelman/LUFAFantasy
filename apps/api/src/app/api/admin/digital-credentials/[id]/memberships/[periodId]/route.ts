import { NextRequest, NextResponse } from "next/server";
import type { UpdateMembershipPeriodRequestDto } from "@lufa/contracts";
import { auditCredential, credentialTransaction } from "@lufa/database/repositories/digitalCredentials";
import { actorOf, adminCredentialError, credentialForMember, CredentialError, forbidden, loadAdminDetail, readJson, requireAdmin } from "@/lib/adminDigitalCredential";

/** Anula un período de membresía (pago rechazado, error de carga). Los pagos de la tienda se anulan con el reembolso. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; periodId: string }> }) {
  try {
    const user = await requireAdmin(request);
    if (!user) return forbidden();
    const { id, periodId } = await params;
    const body = await readJson<UpdateMembershipPeriodRequestDto>(request);
    const reason = typeof body?.reason === "string" ? body.reason.trim().slice(0, 300) : "";
    if (body?.action !== "void" || !reason) throw new CredentialError("Indicá el motivo de la anulación.", 400);
    await credentialTransaction(async (tx) => {
      const credential = await credentialForMember(tx, id);
      const period = await tx.membershipPeriod.findFirst({ where: { id: periodId, memberId: credential.memberId } });
      if (!period) throw new CredentialError("Período de membresía no encontrado.", 404);
      if (period.source === "store_order") throw new CredentialError("Los pagos de la tienda se anulan reembolsando la orden.", 409);
      if (period.status === "voided") return;
      await tx.membershipPeriod.update({ where: { id: period.id }, data: { status: "voided", voidedAt: new Date(), voidReason: reason } });
      await auditCredential(tx, actorOf(user), credential, "membership_voided", "Anuló un período de membresía", { periodId, status: "active" }, { status: "voided", reason });
    });
    return NextResponse.json({ success: true, data: await loadAdminDetail(id) });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos anular la membresía.");
  }
}
