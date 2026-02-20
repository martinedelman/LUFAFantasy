import { NextRequest, NextResponse } from "next/server";
import connectToDatabase from "@/lib/mongodb";
import { UserModel } from "@/models";
import { getSessionTokenFromRequest, verifySessionToken } from "@/lib/auth";

export async function GET(request: NextRequest) {
  try {
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

    const payload = verifySessionToken(token);
    if (!payload) {
      return NextResponse.json(
        {
          success: false,
          message: "Sesión inválida o expirada",
        },
        { status: 401 },
      );
    }

    await connectToDatabase();

    const user = await UserModel.findById(payload.userId);
    if (!user || !user.isActive) {
      return NextResponse.json(
        {
          success: false,
          message: "Usuario no válido",
        },
        { status: 401 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 },
    );
  }
}
