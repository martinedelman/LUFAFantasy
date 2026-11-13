import { NextRequest, NextResponse } from "next/server";
import { PasskeyError } from "@lufa/identity-institutional";
import { currentUserFromRequest } from "@/lib/currentUser";
import { apiErrorResponse } from "@/lib/apiError";

export async function sessionUserOrNull(request: NextRequest) {
  try {
    return await currentUserFromRequest(request);
  } catch {
    return null;
  }
}

export function unauthenticatedResponse() {
  return NextResponse.json({ success: false, message: "Iniciá sesión para administrar tus passkeys." }, { status: 401 });
}

export async function readJsonBody(request: NextRequest): Promise<Record<string, unknown> | null> {
  try {
    const body = await request.json();
    return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function passkeyErrorResponse(request: NextRequest, error: unknown, route: string) {
  if (error instanceof PasskeyError) {
    return apiErrorResponse({ request, error, message: error.message, status: error.status, route });
  }
  return apiErrorResponse({
    request,
    error,
    message: "No pudimos completar la operación con la passkey. Probá nuevamente.",
    status: 500,
    route,
  });
}
