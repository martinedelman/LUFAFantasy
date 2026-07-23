import { NextRequest, NextResponse } from "next/server";
import { AdminService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";

const adminService = new AdminService();
const authService = new AuthService();

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const user = await authService.verifyToken(token);
    if (!user.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const health = await adminService.getSystemHealth();
    return NextResponse.json({ success: true, data: health });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener salud del sistema";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/admin/system-health" });
  }
}
