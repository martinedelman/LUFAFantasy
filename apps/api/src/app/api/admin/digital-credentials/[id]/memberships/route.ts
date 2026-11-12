import { NextRequest, NextResponse } from "next/server";
import { membershipPaymentMethods, type RecordMembershipPaymentRequestDto } from "@lufa/contracts";
import { auditCredential, credentialTransaction, grantMembershipMonths } from "@lufa/database/repositories/digitalCredentials";
import { actorOf, adminCredentialError, credentialForMember, CredentialError, forbidden, loadAdminDetail, parseDateOnly, readJson, requireAdmin } from "@/lib/adminDigitalCredential";

/** Registra un pago de membresía hecho fuera de la tienda (efectivo, transferencia, cobro del equipo). */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireAdmin(request);
    if (!user) return forbidden();
    const { id } = await params;
    const body = await readJson<RecordMembershipPaymentRequestDto>(request);
    if (!body || !membershipPaymentMethods.some((method) => method === body.method)) throw new CredentialError("Elegí el medio de pago.", 400);
    const months = body.months;
    if (months !== undefined && (!Number.isInteger(months) || months < 1 || months > 24)) throw new CredentialError("Indicá entre 1 y 24 meses.", 400);
    if ((months === undefined) === (body.endsAt === undefined)) throw new CredentialError("Indicá la cantidad de meses o la fecha de fin.", 400);
    if (body.amountMinor !== undefined && (!Number.isSafeInteger(body.amountMinor) || body.amountMinor < 0)) throw new CredentialError("El monto no es válido.", 400);
    const reference = typeof body.reference === "string" ? body.reference.trim().slice(0, 200) || null : null;
    const now = new Date();
    const endsAt = body.endsAt === undefined ? null : new Date(parseDateOnly(body.endsAt, "Ingresá una fecha de fin válida.").getTime() + 86_399_000);
    if (endsAt && endsAt <= now) throw new CredentialError("La fecha de fin debe ser futura.", 400);

    await credentialTransaction(async (tx) => {
      const credential = await credentialForMember(tx, id);
      const data = { source: "offline", method: body.method!, amountMinor: body.amountMinor ?? null, reference, recordedById: user.id! };
      const period = months !== undefined
        ? await grantMembershipMonths(tx, credential.memberId, months, data, now)
        : await tx.membershipPeriod.create({ data: { ...data, memberId: credential.memberId, startsAt: now, endsAt: endsAt! } });
      await auditCredential(tx, actorOf(user), credential, "membership_recorded", "Registró un pago de membresía offline", {}, {
        periodId: period.id, method: period.method, startsAt: period.startsAt.toISOString(), endsAt: period.endsAt.toISOString(),
        amountMinor: period.amountMinor, reference: period.reference,
      });
    });
    return NextResponse.json({ success: true, data: await loadAdminDetail(id) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos registrar la membresía.");
  }
}
