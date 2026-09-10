import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Rutas que requieren autenticación de administrador
  const adminRoutes = [
    "/admin",
    "/tournaments/create",
    "/tournaments/new",
    "/teams/create",
    "/players/create",
    "/games/create",
  ];

  // Rutas de edición que requieren autenticación de administrador
  const editRoutes = ["/tournaments/edit", "/teams/edit", "/players/edit", "/games/edit"];

  // Rutas que requieren autenticación de usuario
  const authRoutes = ["/profile"];

  // Log para debugging
  console.log(`🛡️ Middleware - Ruta: ${pathname}`);

  // Verificar si es una ruta de administrador
  const isAdminRoute =
    adminRoutes.some((route) => pathname.startsWith(route)) ||
    editRoutes.some((route) => pathname.includes(route));

  // Verificar si es una ruta que requiere autenticación
  const isAuthRoute = authRoutes.some((route) => pathname.startsWith(route));

  // Por ahora solo loggeamos, la validación real se hace en los componentes AdminProtection
  if (isAdminRoute) {
    console.log(`🔐 Ruta de administrador detectada: ${pathname}`);
  }

  if (isAuthRoute) {
    console.log(`👤 Ruta de usuario autenticado detectada: ${pathname}`);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Rutas que requieren autenticación
    "/admin/:path*",
    "/tournaments/create",
    "/tournaments/:id/edit",
    "/teams/create",
    "/teams/:id/edit",
    "/players/create",
    "/players/:id/edit",
    "/games/create",
    "/games/:id/edit",
    "/profile/:path*",
  ],
};
