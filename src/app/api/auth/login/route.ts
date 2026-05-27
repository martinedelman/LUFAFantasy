import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { apiErrorResponse } from "@/lib/apiError";
import { toUserResponseDto } from "@/app/DTOs";
import type { LoginRequestDto } from "@/app/DTOs";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    key: "auth:login",
    limit: 4,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const { email, password } = (await request.json()) as LoginRequestDto;

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email y contraseña son requeridos",
        },
        { status: 400 },
      );
    }

    const { user, token } = await authService.login(email, password);

    const response = NextResponse.json({
      success: true,
      message: "Sesión iniciada correctamente",
      data: toUserResponseDto(user),
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const status =
      message.includes("Credenciales") || message.includes("inactivo") || message.includes("pendiente")
        ? 401
        : 500;

    return apiErrorResponse({
      request,
      error,
      message,
      status,
      route: "/api/auth/login",
    });
  }
}
