import { NextRequest, NextResponse } from "next/server";
import { DashboardService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";
import { createCacheHeaders, getCachedValue } from "@/lib/serverCache";

const dashboardService = new DashboardService();
const DASHBOARD_CACHE_TTL_SECONDS = 1800; // 30 minutos

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const stats = await getCachedValue("dashboard:stats", DASHBOARD_CACHE_TTL_SECONDS * 1000, () =>
      dashboardService.getStats(),
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
