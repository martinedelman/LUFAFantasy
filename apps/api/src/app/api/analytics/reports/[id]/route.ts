import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import type { AnalyticsReportDto } from "@lufa/contracts";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await analyticsActor(request); if (access.response) return access.response;
  const report = await serviceContainer.analyticsReportService.get((await params).id, access.user!.id!, access.user!.isAdmin());
  return report ? NextResponse.json({ success: true, data: report }) : NextResponse.json({ success: false, message: "Reporte no encontrado" }, { status: 404 });
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await analyticsActor(request); if (access.response) return access.response;
  try {
    const body = await request.json() as { expectedVersion: number; report: AnalyticsReportDto };
    const id = (await params).id;
    const before = await serviceContainer.analyticsReportService.get(id, access.user!.id!, access.user!.isAdmin());
    const report = await serviceContainer.analyticsReportService.update(id, access.user!.id!, access.user!.isAdmin(), body.expectedVersion, body.report);
    if (report && (before?.scope === "template" || report.scope === "template")) await serviceContainer.adminService.recordAudit(access.user!, { action: "analytics.template.updated", entityType: "analytics_report", entityId: report.id, entityLabel: report.name, summary: `Actualizó plantilla de analítica ${report.name}`, before, after: report });
    return report ? NextResponse.json({ success: true, data: report }) : NextResponse.json({ success: false, message: "El reporte cambió o no tenés permiso" }, { status: 409 });
  } catch (error) { return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "Reporte inválido" }, { status: 400 }); }
}
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await analyticsActor(request); if (access.response) return access.response;
  const expectedVersion = Number(new URL(request.url).searchParams.get("version"));
  const id = (await params).id;
  const before = await serviceContainer.analyticsReportService.get(id, access.user!.id!, access.user!.isAdmin());
  const deleted = await serviceContainer.analyticsReportService.remove(id, access.user!.id!, access.user!.isAdmin(), expectedVersion);
  if (deleted && before?.scope === "template") await serviceContainer.adminService.recordAudit(access.user!, { action: "analytics.template.deleted", entityType: "analytics_report", entityId: before.id, entityLabel: before.name, summary: `Eliminó plantilla de analítica ${before.name}`, before });
  return deleted ? NextResponse.json({ success: true }) : NextResponse.json({ success: false, message: "El reporte cambió o no tenés permiso" }, { status: 409 });
}
