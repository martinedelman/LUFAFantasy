import { NextRequest, NextResponse } from "next/server";
import { credentialTransaction, normalizeCredentialEmail } from "@lufa/database/repositories/digitalCredentials";
import { activeCredentialWhere, adminCredentialError, checkedRoleLabel, CredentialError, issueCredential, rejectExistingCredential } from "@/lib/adminDigitalCredential";
import { currentUserFromRequest } from "@/lib/currentUser";
import { serializeCredential } from "@/lib/digitalCredential";

export async function POST(request: NextRequest) {
  try {
    const actor = await currentUserFromRequest(request);
    if (!actor?.isAdmin()) return NextResponse.json({ success: false, message: "No autorizado." }, { status: 403 });

    const body = await request.json().catch(() => null) as { playerId?: unknown; roles?: unknown } | null;
    if (!body || typeof body.playerId !== "string" || !body.playerId.trim()) {
      throw new CredentialError("Seleccioná un jugador para emitir su ID digital.", 400);
    }
    const playerId = body.playerId;
    const roleLabel = checkedRoleLabel(body.roles === undefined ? ["player"] : body.roles, true);
    const credential = await credentialTransaction(async (tx) => {
      const player = await tx.player.findUnique({
        where: { id: playerId },
        include: { team: { select: { name: true } } },
      });
      if (!player) throw new CredentialError("No encontramos la ficha del jugador seleccionado.", 404);

      const email = normalizeCredentialEmail(player.email ?? "");
      if (!email) throw new CredentialError("Completá el correo de la ficha antes de emitir la credencial.", 400);

      const accounts = await tx.user.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        select: { id: true, isActive: true },
        take: 2,
      });
      rejectExistingCredential(await tx.digitalCredential.findMany({ where: activeCredentialWhere([{ playerId, email }]) }));
      const [account] = accounts;
      if (accounts.length !== 1 || !account?.isActive) {
        throw new CredentialError("La ficha debe tener una cuenta LUFA activa vinculada a su correo.", 400);
      }

      return issueCredential(tx, actor, new Date().getUTCFullYear(), {
        userId: account.id, playerId, subjectType: "player", roleLabel,
        displayName: `${player.firstName} ${player.lastName}`.trim(),
        profilePicture: player.profilePicture, organizationName: player.team.name,
        nationalityCode: "UY", dateOfBirth: player.dateOfBirth,
      });
    });
    return NextResponse.json({ success: true, data: serializeCredential(credential) }, { status: 201 });
  } catch (error) {
    return adminCredentialError(request, error, "No pudimos emitir la credencial de jugador.");
  }
}
