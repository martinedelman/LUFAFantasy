import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { passkeyErrorResponse, sessionUserOrNull, unauthenticatedResponse } from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, { key: "auth:passkey-registration", limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

  const user = await sessionUserOrNull(request);
  if (!user) return unauthenticatedResponse();

  try {
    const options = await serviceContainer.passkeyService.createRegistrationOptions(user);
    return NextResponse.json({ success: true, data: options }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return passkeyErrorResponse(request, error, "/api/auth/passkeys/registration/options");
  }
}
