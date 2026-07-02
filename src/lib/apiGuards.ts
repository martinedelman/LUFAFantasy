import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import type { User } from "@/entities/User";

const authService = new AuthService();

type AuthFailure = NextResponse;

export async function requireAdmin(request: NextRequest): Promise<AuthFailure | null> {
  const token = getSessionTokenFromRequest(request);

  if (!token) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }

  const isAdmin = await authService.verifyAdmin(token);
  if (!isAdmin) {
    return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  }

  return null;
}

export async function requireLiveMatchAccess(request: NextRequest): Promise<AuthFailure | null> {
  const token = getSessionTokenFromRequest(request);
  const canUseLiveMatch = token ? await authService.verifyLiveMatchAccess(token) : false;

  if (!canUseLiveMatch) {
    return NextResponse.json(
      { success: false, message: "No autorizado. Solo administradores o jueces pueden usar Live Match" },
      { status: token ? 403 : 401 },
    );
  }

  return null;
}

export async function requireAuthenticatedUser(request: NextRequest): Promise<User | AuthFailure> {
  const token = getSessionTokenFromRequest(request);

  if (!token) {
    return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  }

  return authService.verifyToken(token);
}

export function isAuthFailure(result: User | AuthFailure): result is AuthFailure {
  return result instanceof NextResponse;
}
