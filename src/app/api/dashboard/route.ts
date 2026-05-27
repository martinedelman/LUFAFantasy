import { NextResponse } from "next/server";
import { DashboardService } from "@/services/backend";

const dashboardService = new DashboardService();

export async function GET(): Promise<NextResponse> {
  try {
    const stats = await dashboardService.getStats();
    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error("Dashboard API error:", error);
    return NextResponse.json({ success: false, message: "Error fetching dashboard data" }, { status: 500 });
  }
}
