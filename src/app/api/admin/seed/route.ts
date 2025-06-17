import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import connectToDatabase from "@/lib/mongodb";
import { UserModel } from "@/models";

// POST /api/admin/seed - Inicializar base de datos con usuarios de prueba
export async function POST(request: NextRequest) {
  try {
    await connectToDatabase();

    // Verificar si ya existen usuarios
    const existingUsers = await UserModel.countDocuments();

    if (existingUsers > 0) {
      return NextResponse.json(
        {
          success: false,
          message: "La base de datos ya contiene usuarios. Use el endpoint de reset para limpiar primero.",
          existingUsers,
        },
        { status: 400 }
      );
    }

    // Crear contraseñas hasheadas
    const adminPassword = await bcrypt.hash("admin123", 12);
    const userPassword = await bcrypt.hash("user123", 12);

    // Crear usuarios de ejemplo
    const users = await UserModel.insertMany([
      {
        name: "Administrador LUFA",
        email: "admin@lufa.com",
        password: adminPassword,
        role: "admin",
        isActive: true,
        profile: {
          bio: "Administrador principal del sistema LUFA Fantasy",
          phone: "+52 55 1234 5678",
        },
      },
      {
        name: "Usuario Demo",
        email: "user@lufa.com",
        password: userPassword,
        role: "user",
        isActive: true,
        profile: {
          bio: "Usuario de ejemplo para pruebas",
          phone: "+52 55 8765 4321",
        },
      },
    ]);

    return NextResponse.json(
      {
        success: true,
        message: "Usuarios de prueba creados exitosamente",
        data: {
          usersCreated: users.length,
          users: users.map((user) => ({
            id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
          })),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error al crear usuarios:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}

// DELETE /api/admin/seed - Limpiar todos los usuarios
export async function DELETE(request: NextRequest) {
  try {
    await connectToDatabase();

    const result = await UserModel.deleteMany({});

    return NextResponse.json(
      {
        success: true,
        message: "Todos los usuarios han sido eliminados",
        deletedCount: result.deletedCount,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error al eliminar usuarios:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Error interno del servidor",
        error: error instanceof Error ? error.message : "Error desconocido",
      },
      { status: 500 }
    );
  }
}
