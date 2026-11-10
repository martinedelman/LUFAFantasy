import { NextRequest, NextResponse } from "next/server";
import { verifyCredential } from "@/lib/digitalCredential";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return NextResponse.json({ success: true, data: await verifyCredential(publicId) }, {
    headers: { "Cache-Control": "no-store" },
  });
}
