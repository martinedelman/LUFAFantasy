import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";
import { setSessionCookie } from "@/lib/auth";
import { UserFactory } from "@/entities/factories";

const authService = new AuthService();

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Email y contraseña son requeridos",
        },
        { status: 400 },
      );
    }

    const { user, token } = await authService.login(email, password);

    const response = NextResponse.json({
      success: true,
      message: "Sesión iniciada correctamente",
      data: UserFactory.toApiResponse(user),
    });

    setSessionCookie(response, token);
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const status = message.includes("Credenciales") || message.includes("inactivo") ? 401 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
