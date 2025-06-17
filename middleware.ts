import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Por ahora, permitir acceso a todas las rutas
  // TODO: Implementar verificación de autenticación cuando NextAuth esté funcionando

  const { pathname } = request.nextUrl;

  // Rutas que requieren autenticación de administrador
  const adminRoutes = ["/admin", "/tournaments/create", "/teams/create", "/players/create", "/games/create"];

  // Rutas que requieren autenticación de usuario
  const authRoutes = ["/profile"];

  // Log para debugging
  console.log(`🛡️ Middleware - Ruta: ${pathname}`);

  // TODO: Cuando NextAuth esté funcionando, verificar autenticación aquí
  /*
  if (adminRoutes.some(route => pathname.startsWith(route))) {
    // Verificar si el usuario es admin
    const token = request.cookies.get('next-auth.session-token');
    if (!token || !isAdmin(token)) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }

  if (authRoutes.some(route => pathname.startsWith(route))) {
    // Verificar si el usuario está autenticado
    const token = request.cookies.get('next-auth.session-token');
    if (!token) {
      return NextResponse.redirect(new URL('/auth/signin', request.url));
    }
  }
  */

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
