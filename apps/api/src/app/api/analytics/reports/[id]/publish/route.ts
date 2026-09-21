import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import { NextRequest, NextResponse } from "next/server";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await analyticsActor(request); if (access.response) return access.response;
  if (!access.user!.isAdmin()) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
  const body = await request.json() as { expectedVersion: number };
  const current = await serviceContainer.analyticsReportService.get((await params).id, access.user!.id!, true);
  if (!current || current.scope === "system") return NextResponse.json({ success: false, message: "Reporte no encontrado" }, { status: 404 });
  const report = await serviceContainer.analyticsReportService.update(current.id, access.user!.id!, true, body.expectedVersion, { ...current, scope: "template" });
  if (report) await serviceContainer.adminService.recordAudit(access.user!, { action: "analytics.template.published", entityType: "analytics_report", entityId: report.id, entityLabel: report.name, summary: `Publicó plantilla de analítica ${report.name}`, before: current, after: report });
  return report ? NextResponse.json({ success: true, data: report }) : NextResponse.json({ success: false, message: "El reporte cambió" }, { status: 409 });
}
