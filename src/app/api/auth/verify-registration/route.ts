import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { toUserResponseDto } from "@/app/DTOs";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    key: "auth:verify-registration",
    limit: 6,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const { token, code } = (await request.json()) as { token?: string; code?: string };

    if (!token || !code) {
      return NextResponse.json(
        {
          success: false,
          message: "Link y código son requeridos",
        },
        { status: 400 },
      );
    }

    const result = await authService.verifyRegistration({
      token,
      code,
    });

    const response = NextResponse.json({
      success: true,
      message: "Cuenta verificada correctamente",
      data: toUserResponseDto(result.user),
    });

    setSessionCookie(response, result.token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const status =
      message.includes("inválido") || message.includes("expiró") || message.includes("intentos") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
