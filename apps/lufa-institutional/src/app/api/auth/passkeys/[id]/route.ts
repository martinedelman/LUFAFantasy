import { NextRequest } from "next/server";
import { proxyInstitutionalAuth } from "@/lib/auth-proxy";

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return proxyInstitutionalAuth(request, `passkeys/${encodeURIComponent(id)}`, { forwardSession: true });
}
