import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { passkeyErrorResponse, sessionUserOrNull, unauthenticatedResponse } from "@/lib/passkeys";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await sessionUserOrNull(request);
  if (!user) return unauthenticatedResponse();

  try {
    const { id } = await params;
    await serviceContainer.passkeyService.removePasskey(user, id);
    return NextResponse.json({ success: true, message: "Passkey eliminada." });
  } catch (error) {
    return passkeyErrorResponse(request, error, "/api/auth/passkeys/:id");
  }
}
