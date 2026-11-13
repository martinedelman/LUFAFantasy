import { NextRequest } from "next/server";
import { proxyInstitutionalAuth } from "@/lib/auth-proxy";

export async function GET(request: NextRequest) {
  return proxyInstitutionalAuth(request, "passkeys", { forwardSession: true });
}
