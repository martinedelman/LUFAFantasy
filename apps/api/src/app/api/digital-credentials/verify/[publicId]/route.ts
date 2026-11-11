import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { verifyCredential } from "@/lib/digitalCredential";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";

export async function GET(request: NextRequest, { params }: { params: Promise<{ publicId: string }> }) {
  const limit = checkRateLimit(request, { key: "digital-credential-verify", limit: 60, windowMs: 60_000 });
  if (!limit.allowed) return rateLimitResponse(limit.resetAt);
  try {
    const { publicId } = await params;
    return NextResponse.json({ success: true, data: await verifyCredential(publicId) }, {
      headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" },
    });
  } catch (error) {
    return apiErrorResponse({ request, error, message: "No pudimos verificar la credencial.", status: 500, route: "/api/digital-credentials/verify" });
  }
}
