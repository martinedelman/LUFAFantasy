import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, {
    key: "auth:password-reset:request",
    limit: 3,
    windowMs: 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json(
        {
          success: false,
          message: "Email requerido",
        },
        { status: 400 },
      );
    }

    await authService.requestPasswordReset(email);

    return NextResponse.json({
      success: true,
      message: "Si existe una cuenta con ese email, enviamos un código de recuperación.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al solicitar recuperación";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/auth/password-reset/request" });
  }
}
