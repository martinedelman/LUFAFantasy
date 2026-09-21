import { serviceContainer } from "@/bootstrap/serviceContainer";
import { analyticsActor } from "@/lib/analyticsAccess";
import type { AnalyticsQueryDto } from "@lufa/contracts";
import { NextRequest, NextResponse } from "next/server";

const csvCell = (value: string | number | undefined) => {
  const text = String(value ?? "");
  const safe = /^[=+\-@]/.test(text) ? `'${text}` : text;
  return `"${safe.replaceAll('"', '""')}"`;
};

export async function POST(request: NextRequest) {
  const access = await analyticsActor(request);
  if (access.response) return access.response;
  try {
    const query = await request.json() as AnalyticsQueryDto;
    if (query.widgets?.length !== 1) return NextResponse.json({ success: false, message: "Elegí un único widget para exportar" }, { status: 400 });
    const result = await serviceContainer.analyticsService.query(query);
    const rows = result.results[0]?.rows || [];
    const csv = ["Etiqueta,Serie,Valor,Eventos", ...rows.map((row) => [row.label, row.series, row.value, row.eventIds.length].map(csvCell).join(","))].join("\r\n");
    return new NextResponse(`\ufeff${csv}`, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${query.widgets[0].title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "analytics"}.csv"`, "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ success: false, message: error instanceof Error ? error.message : "No se pudo exportar" }, { status: 400 });
  }
}
