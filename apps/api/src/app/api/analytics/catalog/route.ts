import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const access = await analyticsActor(request);
  if (access.response) return access.response;
  return NextResponse.json({ success: true, data: await serviceContainer.analyticsService.getCatalogWithFilterOptions() }, { headers: { "Cache-Control": "no-store" } });
}
