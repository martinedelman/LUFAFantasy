import { NextRequest, NextResponse } from "next/server";
import { AuthService } from "@/services/backend";

const authService = new AuthService();

// POST /api/auth/register - Registrar nuevo usuario
export async function POST(request: NextRequest) {
  try {
    const { name, email, password } = await request.json();

    // Validaciones básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Todos los campos son requeridos",
        },
        { status: 400 },
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres",
        },
        { status: 400 },
      );
    }

    // Crear usuario a través del servicio (siempre como 'user')
    const user = await authService.register({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      role: "user",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          _id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          isActive: user.isActive,
          createdAt: user.createdAt?.toISOString(),
          updatedAt: user.updatedAt?.toISOString(),
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error desconocido";
    const status = message.includes("ya está registrado") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
