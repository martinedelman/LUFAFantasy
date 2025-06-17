"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Dashboard", href: "/", icon: "🏠" },
  { name: "Torneos", href: "/tournaments", icon: "🏆" },
  { name: "Equipos", href: "/teams", icon: "👥" },
  { name: "Jugadores", href: "/players", icon: "🏃‍♂️" },
  { name: "Partidos", href: "/games", icon: "🏈" },
  { name: "Posiciones", href: "/standings", icon: "📊" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    setIsUserMenuOpen(false);
  };

  return (
    <nav className="bg-green-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-2xl">🏈</span>
            <span className="text-xl font-bold">LUFA Fantasy</span>
            <span className="hidden sm:inline-block px-2 py-1 bg-green-600 rounded-full text-xs">
              Flag Football
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <div className="flex space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-green-700 text-white"
                      : "text-green-100 hover:bg-green-700 hover:text-white"
                  }`}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium text-green-100 hover:bg-green-700 hover:text-white transition-colors"
                >
                  <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isUserMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 z-50">
                    <div className="px-4 py-2 text-sm text-gray-700 border-b">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-gray-500">{user.email}</div>
                      {user.role === "admin" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                          Administrador
                        </span>
                      )}
                    </div>{" "}
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                      Mi Perfil
                    </Link>
                    {user.role === "admin" && (
                      <>
                        <div className="border-t my-1"></div>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Administración
                        </div>
                        <Link
                          href="/teams/create"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          ➕ Crear Equipo
                        </Link>
                        <Link
                          href="/players/create"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          ➕ Crear Jugador
                        </Link>
                        <Link
                          href="/tournaments/new"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          ➕ Crear Torneo
                        </Link>
                        <Link
                          href="/admin"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          ⚙️ Panel Admin
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/signin" className="text-green-100 hover:text-white transition-colors">
                  Iniciar Sesión
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-green-600 hover:bg-green-500 px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Registrarse
                </Link>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-md text-green-100 hover:text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white"
            >
              <span className="sr-only">Abrir menú principal</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              ) : (
                <svg className="block h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md text-base font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-green-700 text-white"
                      : "text-green-100 hover:bg-green-700 hover:text-white"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{item.icon}</span>
                  <span>{item.name}</span>
                </Link>
              ))}

              {/* Mobile auth buttons */}
              {!user && (
                <div className="pt-4 pb-3 border-t border-green-700">
                  <div className="space-y-1">
                    <Link
                      href="/auth/signin"
                      className="block px-3 py-2 rounded-md text-base font-medium text-green-100 hover:text-white hover:bg-green-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="block px-3 py-2 rounded-md text-base font-medium bg-green-600 hover:bg-green-500"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Registrarse
                    </Link>
                  </div>
                </div>
              )}

              {/* Mobile user menu */}
              {user && (
                <div className="pt-4 pb-3 border-t border-green-700">
                  <div className="flex items-center px-3">
                    <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="ml-3">
                      <div className="text-base font-medium text-white">{user.name}</div>
                      <div className="text-sm font-medium text-green-100">{user.email}</div>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1">
                    {" "}
                    <Link
                      href="/profile"
                      className="block px-3 py-2 rounded-md text-base font-medium text-green-100 hover:text-white hover:bg-green-700"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Mi Perfil
                    </Link>
                    {user.role === "admin" && (
                      <>
                        <div className="border-t border-green-700 my-2"></div>
                        <div className="px-3 py-1 text-xs font-medium text-green-300 uppercase tracking-wider">
                          Administración
                        </div>
                        <Link
                          href="/teams/create"
                          className="block px-3 py-2 rounded-md text-base font-medium text-green-100 hover:text-white hover:bg-green-700"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          ➕ Crear Equipo
                        </Link>
                        <Link
                          href="/players/create"
                          className="block px-3 py-2 rounded-md text-base font-medium text-green-100 hover:text-white hover:bg-green-700"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          ➕ Crear Jugador
                        </Link>
                        <Link
                          href="/tournaments/new"
                          className="block px-3 py-2 rounded-md text-base font-medium text-green-100 hover:text-white hover:bg-green-700"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          ➕ Crear Torneo
                        </Link>
                        <Link
                          href="/admin"
                          className="block px-3 py-2 rounded-md text-base font-medium text-green-100 hover:text-white hover:bg-green-700"
                          onClick={() => setIsMenuOpen(false)}
                        >
                          ⚙️ Panel Admin
                        </Link>
                      </>
                    )}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-green-100 hover:text-white hover:bg-green-700"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
