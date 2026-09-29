import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidModalityResponse, parseModality } from "@/lib/modality";
import { createCacheHeaders, getCachedValue } from "@/lib/serverCache";

const dashboardService = serviceContainer.dashboardService;
const DASHBOARD_CACHE_TTL_SECONDS = 1800; // 30 minutos

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const modality = parseModality(request.nextUrl.searchParams);
    if (!modality) return invalidModalityResponse();

    const stats = await getCachedValue(`dashboard:stats:${modality}`, DASHBOARD_CACHE_TTL_SECONDS * 1000, () =>
      dashboardService.getStats({ modality }),
      { tags: ["dashboard", "teams", "standings", "rankings"] },
    );

    return NextResponse.json(
      { success: true, data: stats },
      {
        headers: createCacheHeaders(DASHBOARD_CACHE_TTL_SECONDS),
      },
    );
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error fetching dashboard data",
      status: 500,
      route: "/api/dashboard",
    });
  }
}
