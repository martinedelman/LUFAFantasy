import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function GET(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  return user
    ? NextResponse.json({ success: true, data: user })
    : NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
}

export async function PATCH(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  try {
    const body = await request.json();
    const updated = await serviceContainer.fantasyIdentityService.updateProfile(user.id, String(body.name || ""));
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return fantasyApiErrorResponse({
      request,
      error,
      route: "/api/fantasy/v1/auth/me",
      knownMessages: ["Ingresá tu nombre"],
    });
  }
}
