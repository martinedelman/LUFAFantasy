import { getSessionTokenFromRequest } from "@/lib/auth";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import type { NextRequest } from "next/server";

export async function currentUserFromRequest(request: NextRequest) {
  const token = getSessionTokenFromRequest(request);
  return token ? serviceContainer.authService.verifyToken(token) : null;
}
