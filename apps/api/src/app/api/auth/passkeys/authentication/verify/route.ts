import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { setSessionCookie } from "@/lib/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { safeTrack } from "@/lib/serverAnalytics";
import { toUserResponseDto } from "@/app/DTOs";
import { passkeyErrorResponse, readJsonBody } from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, { key: "auth:passkey-login", limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ success: false, message: "La solicitud no es válida." }, { status: 400 });

  try {
    const { user, token } = await serviceContainer.passkeyService.verifyAuthentication(body.response);
    const response = NextResponse.json({
      success: true,
      message: "Sesión iniciada correctamente",
      data: toUserResponseDto(user),
    });
    setSessionCookie(response, token);
    if (user.role === "user") await safeTrack("Login completed", { userRole: user.role, method: "passkey" });
    return response;
  } catch (error) {
    return passkeyErrorResponse(request, error, "/api/auth/passkeys/authentication/verify");
  }
}
