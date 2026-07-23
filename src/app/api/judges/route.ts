import { NextRequest, NextResponse } from "next/server";
import { AdminService, AuthService, JudgeService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { apiErrorResponse } from "@/lib/apiError";
import { toJudgeResponseDto } from "@/app/DTOs";
import type { CreateJudgeRequestDto } from "@/app/DTOs";

const authService = new AuthService();
const judgeService = new JudgeService();
const adminService = new AdminService();

export async function GET(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const actor = await authService.verifyToken(token);
    if (!actor.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

    const judges = await judgeService.listJudges();

    return NextResponse.json({
      success: true,
      data: judges.map((judge) => toJudgeResponseDto(judge)),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al obtener jueces";
    return apiErrorResponse({ request, error, message, status: 500, route: "/api/judges" });
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
    }

    const actor = await authService.verifyToken(token);
    if (!actor.isAdmin()) {
      return NextResponse.json({ success: false, message: "No autorizado" }, { status: 403 });
    }

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

    await adminService.recordAudit(actor, {
      action: "judge.created",
      entityType: "judge",
      entityId: judge._id,
      entityLabel: `${judge.firstName} ${judge.lastName}`,
      summary: `Creó juez ${judge.firstName} ${judge.lastName}`,
      after: {
        id: judge._id,
        firstName: judge.firstName,
        lastName: judge.lastName,
      },
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
    const message = error instanceof Error ? error.message : "Error al crear juez";
    const status = message.includes("ya existe") ? 409 : 400;

    return apiErrorResponse({ request, error, message, status, route: "/api/judges" });
  }
}
