import { NextRequest, NextResponse } from "next/server";
import { AdminService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import type { UpdateSiteSettingsRequestDto } from "@/app/DTOs";

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

    const settings = await adminService.getSiteSettings();
    return NextResponse.json({ success: true, data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener configuración";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/admin/settings" });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const actor = await authService.verifyToken(token);
    if (!actor.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const body = (await request.json()) as UpdateSiteSettingsRequestDto;
    const settings = await adminService.updateSiteSettings(actor, body);

    return NextResponse.json({ success: true, message: "Configuración actualizada", data: settings });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar configuración";
    return apiErrorResponse({ request, error, message, status: 400, route: "/api/admin/settings" });
  }
}
