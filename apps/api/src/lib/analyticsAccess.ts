import { serviceContainer } from "@/bootstrap/serviceContainer";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";

export async function analyticsActor(request: NextRequest) {
  const token = getSessionTokenFromRequest(request);
  if (!token) return { response: NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 }) };
  try {
    const user = await serviceContainer.authService.verifyToken(token);
    if (!user.canViewAnalytics()) return { response: NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 }) };
    return { user };
  } catch {
    return { response: NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 }) };
  }
}
