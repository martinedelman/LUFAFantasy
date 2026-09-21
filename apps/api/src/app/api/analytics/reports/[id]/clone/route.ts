import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await analyticsActor(request); if (access.response) return access.response;
  const report = await serviceContainer.analyticsReportService.clone((await params).id, access.user!.id!, access.user!.isAdmin());
  return report ? NextResponse.json({ success: true, data: report }, { status: 201 }) : NextResponse.json({ success: false, message: "Reporte no encontrado" }, { status: 404 });
}
