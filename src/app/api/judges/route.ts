import { NextRequest, NextResponse } from "next/server";
import { JudgeService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAdmin } from "@/lib/apiGuards";
import { toJudgeResponseDto } from "@/app/DTOs";
import type { CreateJudgeRequestDto } from "@/app/DTOs";

const judgeService = new JudgeService();

export async function GET(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const judges = await judgeService.listJudges();

    return NextResponse.json({
      success: true,
      data: judges.map((judge) => toJudgeResponseDto(judge)),
    });
  } catch (error) {
    const message = extractErrorMessage(error, "Error al obtener jueces");
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/judges" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authError = await requireAdmin(request);
    if (authError) return authError;

    const body = (await request.json()) as CreateJudgeRequestDto;

    if (!body.firstName?.trim() || !body.lastName?.trim()) {
      return NextResponse.json(
        {
          success: false,
          message: "Datos incompletos: firstName y lastName son requeridos",
        },
        { status: 400 },
      );
    }

    const judge = await judgeService.createJudge({
      firstName: body.firstName,
      lastName: body.lastName,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Juez creado exitosamente",
        data: toJudgeResponseDto(judge),
      },
      { status: 201 },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al crear juez");
    const status = resolveErrorStatus(message, [{ match: "ya existe", status: 409 }]);

    return apiErrorResponse({ request, error, message, status, route: "/api/judges" });
  }
}
