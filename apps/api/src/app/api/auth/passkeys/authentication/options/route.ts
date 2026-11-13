import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { passkeyErrorResponse } from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, { key: "auth:passkey-options", limit: 20, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

  try {
    const options = await serviceContainer.passkeyService.createAuthenticationOptions();
    return NextResponse.json({ success: true, data: options }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return passkeyErrorResponse(request, error, "/api/auth/passkeys/authentication/options");
  }
}
