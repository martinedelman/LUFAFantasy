import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import type { AnalyticsReportDto } from "@lufa/contracts";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const access = await analyticsActor(request); if (access.response) return access.response;
  return NextResponse.json({ success: true, data: await serviceContainer.analyticsReportService.list(access.user!.id!) }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: NextRequest) {
  const access = await analyticsActor(request); if (access.response) return access.response;
  try {
    const body = await request.json() as { report: Omit<AnalyticsReportDto, "id" | "ownerId" | "version" | "createdAt" | "updatedAt" | "scope"> & { scope?: "personal" | "template" } };
    const data = await serviceContainer.analyticsReportService.create(access.user!.id!, access.user!.isAdmin(), body.report);
    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Reporte inválido" }, { status: 400 }); }
}
