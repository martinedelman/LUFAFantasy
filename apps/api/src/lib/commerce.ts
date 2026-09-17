import type { CommerceActor } from "@lufa/commerce";
import { CommerceError } from "@lufa/commerce";
import type { User } from "@lufa/sports/entities/User";
import { NextRequest, NextResponse } from "next/server";
import { currentUserFromRequest } from "./currentUser";
import { apiErrorResponse } from "./apiError";

export function commerceActor(user: User): CommerceActor {
  if (!user.id) throw new CommerceError("Usuario inválido.", "INVALID_USER", 401);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}
export async function requireCommerceActor(request: NextRequest) {
  const user = await currentUserFromRequest(request);
  if (!user) throw new CommerceError("Iniciá sesión para continuar.", "UNAUTHENTICATED", 401);
  return commerceActor(user);
}
export function commerceErrorResponse(request: NextRequest, error: unknown, route: string) {
  const status = error instanceof CommerceError ? error.status : 500;
  return apiErrorResponse({ request, error, message: error instanceof CommerceError ? error.message : "No pudimos completar la operación.", status, route });
}
export function noStoreJson(data: unknown, status = 200) {
  return NextResponse.json({ success: true, data }, { status, headers: { "Cache-Control": "no-store" } });
}
