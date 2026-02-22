import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { UserFactory } from "@/entities/factories";

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
      data: UserFactory.toApiResponse(user),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
