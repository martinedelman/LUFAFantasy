import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { setFantasySession } from "@/lib/fantasyAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";
import { safeTrack } from "@/lib/serverAnalytics";

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, { key: "fantasy:register", limit: 5, windowMs: 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);
  try {
    const body = await request.json();
    const result = await serviceContainer.fantasyIdentityService.register({
      name: String(body.name || ""),
      email: String(body.email || ""),
      password: String(body.password || ""),
    });
    const response = NextResponse.json({ success: true, data: result.user }, { status: 201 });
    setFantasySession(response, result.token);
    await safeTrack("Fantasy registration completed");
    return response;
  } catch (error) {
    return fantasyApiErrorResponse({
      request,
      error,
      route: "/api/fantasy/v1/auth/register",
      knownMessages: ["Ingresá tu nombre", "Ingresá un email válido", "La contraseña debe", "El email ya está registrado"],
    });
  }
}
