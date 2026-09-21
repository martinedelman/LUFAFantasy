import { NextRequest } from "next/server";
import { proxyInstitutionalAuth } from "@/lib/auth-proxy";

export async function POST(request: NextRequest) {
  return proxyInstitutionalAuth(request, "verify-registration", { copySession: true });
}
