import { NextRequest, NextResponse } from "next/server";
import { AdminService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";

const adminService = new AdminService();
const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const actor = await authService.verifyToken(token);
    if (!actor.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const result = await adminService.runPlayerImportDryRun(actor);
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al ejecutar dry-run de importación";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/admin/player-import/dry-run" });
  }
}
