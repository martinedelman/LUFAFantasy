import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    await serviceContainer.fantasyIdentityService.resetPassword({
      email: String(body.email || ""),
      code: String(body.code || ""),
      password: String(body.password || ""),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return fantasyApiErrorResponse({
      request,
      error,
      route: "/api/fantasy/v1/auth/password-reset/confirm",
      knownMessages: ["Código inválido o vencido", "La contraseña debe"],
    });
  }
}
