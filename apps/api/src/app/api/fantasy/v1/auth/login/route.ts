import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { setFantasySession } from "@/lib/fantasyAuth";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";
import { safeTrack } from "@/lib/serverAnalytics";

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, { key: "fantasy:login", limit: 6, windowMs: 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);
  try {
    const body = await request.json();
    const result = await serviceContainer.fantasyIdentityService.login({
      email: String(body.email || ""),
      password: String(body.password || ""),
    });
    const response = NextResponse.json({ success: true, data: result.user });
    setFantasySession(response, result.token);
    await safeTrack("Fantasy login completed");
    return response;
  } catch (error) {
    return fantasyApiErrorResponse({
      request,
      error,
      route: "/api/fantasy/v1/auth/login",
      knownMessages: ["Email o contraseña incorrectos"],
      knownStatus: 401,
    });
  }
}
