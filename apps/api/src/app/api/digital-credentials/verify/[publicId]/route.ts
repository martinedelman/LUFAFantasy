import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { credentialStatus, serializeCredential } from "@/lib/digitalCredential";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const credential = await getPrismaClient().digitalCredential.findUnique({ where: { publicId } });
  if (!credential) return NextResponse.json({ success: true, data: { status: "not_found", credential: null } }, { headers: { "Cache-Control": "no-store" } });
  const status = credentialStatus(credential);
  await getPrismaClient().digitalCredentialAudit.create({ data: { credentialId: credential.id, action: "verified" } });
  return NextResponse.json({ success: true, data: { status, credential: status === "active" ? serializeCredential(credential) : null } }, { headers: { "Cache-Control": "no-store" } });
}
