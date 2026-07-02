import { NextRequest, NextResponse } from "next/server";
import { GameEventCorrectionService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAuthenticatedUser, isAuthFailure } from "@/lib/apiGuards";
import { invalidateCacheByPrefix } from "@/lib/serverCache";

const correctionService = new GameEventCorrectionService();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const result = await requireAuthenticatedUser(request);
    if (isAuthFailure(result)) return result;
    const user = result;

    if (!user.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as { action?: "approve" | "reject"; note?: string };

    if (body.action === "approve") {
      await correctionService.approveCorrection(id, user);
      invalidateCacheByPrefix(["standings", "rankings", "dashboard"]);

      return NextResponse.json({ success: true, message: "Corrección aprobada y aplicada" });
    }

    if (body.action === "reject") {
      await correctionService.rejectCorrection(id, user, body.note);

      return NextResponse.json({ success: true, message: "Corrección rechazada" });
    }

    return NextResponse.json({ success: false, message: "Acción inválida" }, { status: 400 });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al procesar la corrección");
    const status = resolveErrorStatus(message, [{ match: "no encontrada", status: 404 }]);
    return apiErrorResponse({ request, error, message, status, route: "/api/admin/game-event-corrections/[id]" });
  }
}
