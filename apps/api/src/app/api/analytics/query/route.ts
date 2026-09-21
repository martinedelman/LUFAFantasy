import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import { apiErrorResponse } from "@/lib/apiError";
import type { AnalyticsQueryDto } from "@lufa/contracts";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const access = await analyticsActor(request);
  if (access.response) return access.response;
  try {
    const query = await request.json() as AnalyticsQueryDto;
    const data = await serviceContainer.analyticsService.query(query);
    return NextResponse.json({ success: true, data }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Consulta inválida";
    if (/widget|Fuente|Métrica|Dimensión|Serie|Visualización/i.test(message)) return NextResponse.json({ success: false, message }, { status: 400 });
    return apiErrorResponse({ request, error, message: "Error al consultar analítica", status: 500, route: "/api/analytics/query", exposeError: true });
  }
}
