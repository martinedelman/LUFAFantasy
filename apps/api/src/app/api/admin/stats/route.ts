import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";

const adminService = serviceContainer.adminService;
const authService = serviceContainer.authService;

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const stats = await adminService.getSystemStats();

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener estadísticas del sistema";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/admin/stats" });
  }
}
