import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import { NextRequest, NextResponse } from "next/server";
import { invalidModalityResponse, parseModality } from "@/lib/modality";

export async function GET(request: NextRequest) {
  const access = await analyticsActor(request);
  if (access.response) return access.response;
  const modality = parseModality(request.nextUrl.searchParams);
  if (!modality) return invalidModalityResponse();
  return NextResponse.json({ success: true, data: await serviceContainer.analyticsService.getCatalogWithFilterOptions(modality) }, { headers: { "Cache-Control": "no-store" } });
}
