import { NextRequest, NextResponse } from "next/server";
import { AdminService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage } from "@/lib/apiError";
import { requireAdmin } from "@/lib/apiGuards";

const adminService = new AdminService();

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const stats = await adminService.getSystemStats();

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener estadísticas del sistema");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/admin/stats" });
  }
}
