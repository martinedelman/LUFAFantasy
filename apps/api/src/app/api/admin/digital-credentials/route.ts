import { NextRequest, NextResponse } from "next/server";
import type { CreateDigitalCredentialRequestDto } from "@lufa/contracts";
import { currentUserFromRequest } from "@/lib/currentUser";
import { serializeCredential } from "@/lib/digitalCredential";
import { activeCredentialWhere, adminCredentialError, CredentialError, listRecentCredentials, issueCredential, rejectExistingCredential } from "@/lib/adminDigitalCredential";
import { credentialTransaction, normalizeCredentialEmail } from "@lufa/database/repositories/digitalCredentials";
import { apiErrorResponse } from "@/lib/apiError";

async function admin(request: NextRequest) {
  const user = await currentUserFromRequest(request);
  return user?.isAdmin() ? user : null;
}

export async function GET(request: NextRequest) {
  try {
    if (!await admin(request)) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    const search = new URL(request.url).searchParams.get("search")?.trim() || "";
    return NextResponse.json({ success: true, data: await listRecentCredentials(search) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return apiErrorResponse({ request, error, message: "No pudimos obtener las credenciales.", status: 500, route: "/api/admin/digital-credentials" }); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await admin(request);
    if (!actor) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    const body = await request.json().catch(() => null) as CreateDigitalCredentialRequestDto | null;
    if (!body || !body.userId || !body.displayName?.trim() || !body.roleLabel?.trim() || !body.organizationName?.trim() || !/^[A-Z]{2}$/.test(body.nationalityCode || "") || !Number.isInteger(body.season)) {
      return NextResponse.json({ success: false, message: "Completá todos los datos obligatorios de la credencial." }, { status: 400 });
    }
    const dateOfBirth = new Date(body.dateOfBirth);
    if (Number.isNaN(dateOfBirth.getTime()) || (body.subjectType !== "player" && body.subjectType !== "official") || (body.subjectType === "player" ? !body.playerId || body.judgeId : !body.judgeId || body.playerId)) {
      return NextResponse.json({ success: false, message: "La identidad vinculada no es válida." }, { status: 400 });
    }
    const credential = await credentialTransaction(async (tx) => {
      const [user, subject] = await Promise.all([
        tx.user.findUnique({ where: { id: body.userId } }),
        body.subjectType === "player" ? tx.player.findUnique({ where: { id: body.playerId } }) : tx.judge.findUnique({ where: { id: body.judgeId } }),
      ]);
      if (!user || !subject) throw new CredentialError("La cuenta o la ficha seleccionada no existen.", 400);
      rejectExistingCredential(await tx.digitalCredential.findMany({
        where: activeCredentialWhere([{ userId: user.id, playerId: body.playerId, judgeId: body.judgeId, email: normalizeCredentialEmail(user.email) }]),
      }));
      return issueCredential(tx, actor, body.season, {
        userId: user.id, playerId: body.playerId || null, judgeId: body.judgeId || null,
        subjectType: body.subjectType, displayName: body.displayName.trim(), profilePicture: body.profilePicture || null,
        roleLabel: body.roleLabel.trim(), organizationName: body.organizationName.trim(),
        nationalityCode: body.nationalityCode, dateOfBirth,
      });
    });
    return NextResponse.json({ success: true, data: serializeCredential(credential) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos emitir la credencial.");
  }
}
