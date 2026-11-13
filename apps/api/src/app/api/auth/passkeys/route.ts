import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { passkeyErrorResponse, sessionUserOrNull, unauthenticatedResponse } from "@/lib/passkeys";

export async function GET(request: NextRequest) {
  const user = await sessionUserOrNull(request);
  if (!user) return unauthenticatedResponse();

  try {
    const passkeys = await serviceContainer.passkeyService.listPasskeys(user);
    return NextResponse.json({ success: true, data: passkeys }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return passkeyErrorResponse(request, error, "/api/auth/passkeys");
  }
}
