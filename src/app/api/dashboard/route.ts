import { NextResponse } from "next/server";
import { DashboardService } from "@/services/backend";
import { createCacheHeaders, getCachedValue } from "@/lib/serverCache";

const dashboardService = new DashboardService();
const DASHBOARD_CACHE_TTL_SECONDS = 1800; // 30 minutos

export async function GET(): Promise<NextResponse> {
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
    console.error("Dashboard API error:", error);
    return NextResponse.json({ success: false, message: "Error fetching dashboard data" }, { status: 500 });
  }
}
