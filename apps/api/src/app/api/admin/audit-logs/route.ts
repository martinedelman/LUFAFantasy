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

    const user = await authService.verifyToken(token);
    if (!user.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const logs = await adminService.listAuditLogs({
      action: searchParams.get("action") || undefined,
      entityType: searchParams.get("entityType") || undefined,
      actorEmail: searchParams.get("actorEmail") || undefined,
    });

    return NextResponse.json({ success: true, data: logs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener auditoría";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/admin/audit-logs" });
  }
}
