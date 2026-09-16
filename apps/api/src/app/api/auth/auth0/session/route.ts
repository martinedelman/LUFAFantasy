import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { apiErrorResponse } from "@/lib/apiError";
import { toUserResponseDto } from "@/app/DTOs";

const authService = serviceContainer.authService;

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    key: "auth:auth0-session",
    limit: 10,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const { idToken } = (await request.json()) as { idToken?: string };

    if (!idToken) {
      return NextResponse.json(
        {
          success: false,
          message: "Token de identidad requerido",
        },
        { status: 400 },
      );
    }

    const { user, token } = await authService.loginWithExternalIdToken(idToken);
    const response = NextResponse.json({
      success: true,
      data: toUserResponseDto(user),
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const status = message.includes("inválido") || message.includes("Verificá")
      ? 401
      : message.includes("no está configurado")
        ? 503
        : 500;

    return apiErrorResponse({
      request,
      error,
      message,
      status,
      route: "/api/auth/auth0/session",
    });
  }
}
