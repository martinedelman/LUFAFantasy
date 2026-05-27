import { NextRequest, NextResponse } from "next/server";
import { WeeklyDigestEmailService } from "@/services/backend";
import { apiErrorResponse } from "@/lib/apiError";

const weeklyDigestEmailService = new WeeklyDigestEmailService();

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");

  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      {
        success: false,
        message: "Falta configurar CRON_SECRET",
      },
      { status: 500 },
    );
  }

  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(
      {
        success: false,
        message: "No autorizado",
      },
      { status: 401 },
    );
  }

  try {
    const result = await weeklyDigestEmailService.sendWeeklyDigest();

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al enviar digest semanal";
    return apiErrorResponse({
      request,
      error,
      message,
      status: 500,
      route: "/api/cron/weekly-digest",
    });
  }
}
