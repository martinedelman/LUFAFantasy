import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { toUserResponseDto } from "@/app/DTOs";

const authService = new AuthService();

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 },
      );
    }

    const user = await authService.verifyToken(token);

    return NextResponse.json({
      success: true,
      data: toUserResponseDto(user),
    });
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error interno del servidor",
      status: 500,
      route: "/api/auth/me",
      exposeError: true,
    });
  }
}
