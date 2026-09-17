import { serviceContainer } from "@/bootstrap/serviceContainer";
import { NextRequest, NextResponse } from "next/server";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import type { AdminAnalyticsSubject } from "@lufa/contracts";

const authService = serviceContainer.authService;
const analyticsService = serviceContainer.adminAnalyticsService;

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);
    if (!token) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    if (!(await authService.verifyAdmin(token))) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }
    const { searchParams } = new URL(request.url);
    const subject = searchParams.get("subject") || "teams";
    if (subject !== "teams" && subject !== "players") {
      return NextResponse.json({ success: false, message: "subject inválido" }, { status: 400 });
    }
    const analytics = await analyticsService.getAnalytics({
      subject: subject as AdminAnalyticsSubject,
      tournament: searchParams.get("tournament"),
      division: searchParams.get("division"),
    });
    return NextResponse.json({ success: true, data: analytics }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const invalid = error instanceof Error && ["campeonato inválido", "division inválida"].includes(error.message);
    if (invalid) return NextResponse.json({ success: false, message: error.message }, { status: 400 });
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener analítica deportiva",
      status: 500,
      route: "/api/admin/analytics",
      exposeError: true,
    });
  }
}
