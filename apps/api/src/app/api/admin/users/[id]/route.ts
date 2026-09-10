import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import type { UpdateAdminUserRequestDto } from "@/app/DTOs";

const adminService = serviceContainer.adminService;
const authService = serviceContainer.authService;

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const actor = await authService.verifyToken(token);
    if (!actor.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const { id } = await params;
    const body = (await request.json()) as UpdateAdminUserRequestDto;
    const user = await adminService.updateUser(actor, id, body);

    return NextResponse.json({
      success: true,
      message: "Usuario actualizado",
      data: user,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar usuario";
    const status = message.includes("no encontrado") ? 404 : message.includes("No podés") || message.includes("Debe quedar") ? 409 : 400;
    return apiErrorResponse({ request, error, message, status, route: "/api/admin/users/[id]" });
  }
}
