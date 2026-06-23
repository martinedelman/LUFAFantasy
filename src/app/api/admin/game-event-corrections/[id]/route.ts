import { NextRequest, NextResponse } from "next/server";
import { AuthService, GameEventCorrectionService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidateCacheByPrefix } from "@/lib/serverCache";

const authService = new AuthService();
const correctionService = new GameEventCorrectionService();

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const user = await authService.verifyToken(token).catch(() => null);
    if (!user?.isAdmin()) {
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
    const message = error instanceof Error ? error.message : "Error al procesar la corrección";
    const status = message.includes("no encontrada") ? 404 : 400;
    return apiErrorResponse({ request, error, message, status, route: "/api/admin/game-event-corrections/[id]" });
  }
}
