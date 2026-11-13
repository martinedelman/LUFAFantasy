import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { safeTrack } from "@/lib/serverAnalytics";
import { passkeyErrorResponse, readJsonBody, sessionUserOrNull, unauthenticatedResponse } from "@/lib/passkeys";

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(request, { key: "auth:passkey-registration-verify", limit: 10, windowMs: 60 * 1000 });
  if (!rateLimit.allowed) return rateLimitResponse(rateLimit.resetAt);

  const user = await sessionUserOrNull(request);
  if (!user) return unauthenticatedResponse();

  const body = await readJsonBody(request);
  if (!body) return NextResponse.json({ success: false, message: "La solicitud no es válida." }, { status: 400 });

  try {
    const passkey = await serviceContainer.passkeyService.verifyRegistration(user, body.response, body.name);
    await safeTrack("Passkey registered");
    return NextResponse.json({ success: true, message: "Passkey agregada.", data: passkey });
  } catch (error) {
    return passkeyErrorResponse(request, error, "/api/auth/passkeys/registration/verify");
  }
}
