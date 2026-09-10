import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, { key: "fantasy:password-reset", limit: 4, windowMs: 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);
  try {
    const body = await request.json();
    await serviceContainer.fantasyIdentityService.requestPasswordReset(String(body.email || ""));
    return NextResponse.json({ success: true, message: "Si el email existe, vas a recibir un código." });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/auth/password-reset/request" });
  }
}
