import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    key: "auth:password-reset:confirm",
    limit: 5,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const body = (await request.json()) as {
      email?: string;
      code?: string;
      password?: string;
    };

    const email = body.email?.trim().toLowerCase();
    const code = body.code?.trim();
    const password = body.password || "";

    if (!email || !code || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email, código y contraseña son requeridos",
        },
        { status: 400 },
      );
    }

    await authService.resetPassword({
      email,
      code,
      password,
    });

    return NextResponse.json({
      success: true,
      message: "Contraseña actualizada correctamente",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al restaurar contraseña";
    const status =
      message.includes("Código") || message.includes("expiró") || message.includes("intentos") || message.includes("contraseña")
        ? 400
        : 500;
    return apiErrorResponse({ request, error, message, status, route: "/api/auth/password-reset/confirm" });
  }
}
