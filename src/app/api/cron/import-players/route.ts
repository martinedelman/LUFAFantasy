import { NextRequest, NextResponse } from "next/server";
import { PlayerImportService } from "@/services/backend";

const playerImportService = new PlayerImportService();

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader) {
    return NextResponse.json(
      {
        success: false,
        message: "No autorizado",
      },
      { status: 401 },
    );
  }

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
    const { searchParams } = new URL(request.url);
    const dryRun = searchParams.get("dryRun") === "true";
    const result = await playerImportService.importFromGoogleSheet({ dryRun });

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al importar jugadores",
      },
      { status: 500 },
    );
  }
}
