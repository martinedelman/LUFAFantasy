import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import { UserModel } from "@/models";

// POST /api/auth/register - Registrar nuevo usuario
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    const { name, email, password } = await request.json();

    // Validaciones básicas
    if (!name || !email || !password) {
      return NextResponse.json(
        {
          success: false,
          message: "Todos los campos son requeridos",
        },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message: "La contraseña debe tener al menos 6 caracteres",
        },
        { status: 400 }
      );
    }

    // Verificar que el email no esté en uso
    const existingUser = await UserModel.findOne({
      email: email.toLowerCase(),
    });

    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          message: "Este email ya está registrado",
        },
        { status: 400 }
      );
    }

    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 12);

    // Crear usuario (siempre como 'user', nunca como 'admin')
    const user = await UserModel.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: "user", // Forzamos que siempre sea usuario regular
      isActive: true,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error en registro:", error);

    // Manejar errores de validación de mongoose
    if (error instanceof Error && error.name === "ValidationError") {
      return NextResponse.json(
        {
          success: false,
          message: "Datos inválidos",
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
      },
      { status: 500 }
    );
  }
}
