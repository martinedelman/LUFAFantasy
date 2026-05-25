import { NextRequest, NextResponse } from "next/server";
import { TeamService, AuthService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import { toTeamResponseDto } from "@/app/DTOs";
import type { UpdateTeamRequestDto } from "@/app/DTOs";

const teamService = new TeamService();
const authService = new AuthService();

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

/**
 * GET /api/teams/:id - Obtiene un equipo por ID
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    const team = await teamService.getTeamById(id);

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Equipo no encontrado",
        },
        { status: 404 },
      );
    }

    const apiResponse = toTeamResponseDto(team);

    return NextResponse.json({
      success: true,
      data: apiResponse,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Error al obtener equipo",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/teams/:id - Actualiza un equipo
 */
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 },
      );
    }

    const user = await authService.verifyToken(token);
    const team = await teamService.getTeamById(id);

    if (!team) {
      return NextResponse.json(
        {
          success: false,
          message: "Equipo no encontrado",
        },
        { status: 404 },
      );
    }

    const userEmail = normalizeEmail(user.email);
    const canEdit =
      user.role === "admin" ||
      userEmail === normalizeEmail(team.contact?.email) ||
      userEmail === normalizeEmail(team.coach?.email);

    if (!canEdit) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo el contacto del equipo, el entrenador o un administrador pueden editarlo",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as UpdateTeamRequestDto;

    const updatedTeam = await teamService.updateTeam(id, {
      name: body.name,
      colors: body.colors,
      shortName: body.shortName,
      logo: body.logo,
      backgroundImage: body.backgroundImage,
      contact: body.contact,
      coach: body.coach,
      status: body.status,
      players: body.players,
    });

    return NextResponse.json({
      success: true,
      message: "Equipo actualizado exitosamente",
      data: toTeamResponseDto(updatedTeam),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al actualizar equipo";
    const status = message.includes("no encontrado")
      ? 404
      : message.includes("Token") || message.includes("Usuario")
        ? 401
        : 400;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}

/**
 * DELETE /api/teams/:id - Eliminar equipo (no permitido)
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  void request;
  void params;

  return NextResponse.json(
    {
      success: false,
      message: "No permitido. Los equipos no se pueden eliminar",
    },
    { status: 405 },
  );
}
