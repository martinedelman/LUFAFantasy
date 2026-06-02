"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";

const navigation = [
  { name: "Torneos", href: "/tournaments" },
  { name: "Equipos", href: "/teams" },
  { name: "Jugadores", href: "/players" },
  { name: "Partidos", href: "/games" },
  { name: "Posiciones", href: "/standings" },
  { name: "Rankings", href: "/rankings" },
];

export default function Navbar() {
  const pathname = usePathname();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const userMenuRef = useRef<HTMLDivElement | null>(null);
  const userMenuButtonRef = useRef<HTMLButtonElement | null>(null);
  const { user, signOut } = useAuth();

  const handleSignOut = () => {
    signOut();
    setIsUserMenuOpen(false);
  };

  const linkBaseClass =
    "px-3 py-2 rounded-full text-sm font-medium transition-colors duration-200 border border-transparent";

  useEffect(() => {
    if (!isMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (mobileMenuRef.current?.contains(target) || mobileMenuButtonRef.current?.contains(target)) {
        return;
      }

      setIsMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isMenuOpen]);

  useEffect(() => {
    if (!isUserMenuOpen) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;

      if (userMenuRef.current?.contains(target) || userMenuButtonRef.current?.contains(target)) {
        return;
      }

      setIsUserMenuOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isUserMenuOpen]);

  return (
    <nav className="sticky top-0 z-50 border-b border-white/10 bg-blue-900/70 text-white backdrop-blur-xl shadow-2xl h-[70px]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-[70px]">
          {/* Logo */}
          <div className="flex items-center gap-4 min-w-0">
            <Link href="/" className="flex items-center group">
              <div className="h-8 w-8 md:h-9 md:w-9 rounded-md overflow-hidden bg-white/95 border border-white/30 shadow-md flex-shrink-0 ring-1 ring-white/10 transition-transform hover:scale-110">
                <Image
                  src="/lufa_flag_icon.jpeg"
                  alt="Logo LUFA"
                  width={36}
                  height={36}
                  className="h-full w-full object-cover"
                  priority
                />
              </div>
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden min-[950px]:flex items-center space-x-6">
            <div className="flex space-x-6">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`${linkBaseClass} ${
                    pathname === item.href
                      ? "bg-white/16 text-white border-white/20 shadow-sm"
                      : "text-green-50/90 hover:bg-white/10 hover:text-white hover:border-white/10"
                  }`}
                >
                  <span>{item.name}</span>
                </Link>
              ))}
            </div>

            {/* User Menu */}
            {user ? (
              <div className="relative">
                <button
                  ref={userMenuButtonRef}
                  onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium text-green-50/90 border border-transparent hover:bg-white/10 hover:text-white hover:border-white/10 transition-colors duration-200"
                >
                  <div className="w-8 h-8 bg-white/14 rounded-full flex items-center justify-center border border-white/15">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <span>{user.name}</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {isUserMenuOpen && (
                  <div
                    ref={userMenuRef}
                    className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white/95 backdrop-blur-md shadow-[0_18px_40px_rgba(15,23,42,0.18)] py-2 z-50 overflow-hidden"
                  >
                    <div className="px-4 py-3 text-sm text-gray-700 border-b border-slate-200">
                      <div className="font-medium">{user.name}</div>
                      <div className="text-gray-500">{user.email}</div>
                      {user.role === "admin" && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 mt-1">
                          Administrador
                        </span>
                      )}
                    </div>{" "}
                    <Link href="/profile" className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                      Mi Perfil
                    </Link>
                    {user.role === "admin" && (
                      <>
                        <div className="border-t border-slate-200 my-1"></div>
                        <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Administración
                        </div>
                        <Link href="/teams/create" className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                          Crear Equipo
                        </Link>
                        <Link
                          href="/players/create"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"
                        >
                          Crear Jugador
                        </Link>
                        <Link
                          href="/tournaments/new"
                          className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"
                        >
                          Crear Torneo
                        </Link>
                        <Link href="/admin" className="block px-4 py-2 text-sm text-gray-700 hover:bg-slate-100">
                          Panel Admin
                        </Link>
                      </>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-slate-100"
                    >
                      Cerrar Sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link href="/auth/signin" className="text-green-50/90 hover:text-white transition-colors text-sm">
                  Iniciar Sesión
                </Link>
                <Link
                  href="/auth/signup"
                  className="bg-white/12 hover:bg-white/18 border border-white/15 px-4 py-2 rounded-full text-sm font-medium transition-colors shadow-sm"
                >
                  Registrarse
                </Link>
              </div>
            )}

            <a
              href="https://lufa.com.uy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ir a lufa.com.uy"
              className="h-8 w-8 md:h-9 md:w-9 rounded-md overflow-hidden bg-white/95 border border-white/30 shadow-md flex-shrink-0 ring-1 ring-white/10 transition-transform hover:scale-110"
            >
              <Image
                src="/lufa_icon.png"
                alt="Logo LUFA"
                width={36}
                height={36}
                className="h-full w-full object-cover"
                priority
              />
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="min-[950px]:hidden flex items-center gap-3">
            <button
              ref={mobileMenuButtonRef}
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 rounded-full text-green-50/90 hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/60"
            >
              <span className="sr-only">Abrir menú principal</span>
              {!isMenuOpen ? (
                <svg className="block h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              ) : (
                <svg className="block h-6 w-6" stroke="currentColor" fill="none" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
            </button>
            <a
              href="https://lufa.com.uy"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Ir a lufa.com.uy"
              className="h-8 w-8 rounded-md overflow-hidden bg-white/95 border border-white/30 shadow-md flex-shrink-0 ring-1 ring-white/10 transition-transform hover:scale-110"
            >
              <Image
                src="/lufa_icon.png"
                alt="Logo LUFA"
                width={32}
                height={32}
                className="h-full w-full object-cover"
                priority
              />
            </a>
          </div>
        </div>

        {/* Mobile menu */}
        {isMenuOpen && (
          <div className="min-[950px]:hidden">
            <div
              ref={mobileMenuRef}
              className="px-2 pt-2 mt-2 pb-3 space-y-1 sm:px-3 rounded-2xl border border-white/10 bg-blue-950 mb-3 shadow-[0_12px_32px_rgba(15,23,42,0.22)]"
            >
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`block px-3 py-2 rounded-xl text-base font-medium transition-colors ${
                    pathname === item.href
                      ? "bg-white/16 text-white"
                      : "text-green-50/90 hover:bg-white/10 hover:text-white"
                  }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  <span>{item.name}</span>
                </Link>
              ))}

              {/* Mobile auth buttons */}
              {!user && (
                <div className="pt-4 pb-3 border-t border-white/10">
                  <div className="space-y-1">
                    <Link
                      href="/auth/signin"
                      className="block px-3 py-2 rounded-xl text-base font-medium text-green-50/90 hover:text-white hover:bg-white/10"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Iniciar Sesión
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="block px-3 py-2 rounded-xl text-base font-medium bg-white/12 border border-white/15 hover:bg-white/18"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Registrarse
                    </Link>
                  </div>
                </div>
              )}

              {/* Mobile user menu */}
              {user && (
                <div className="pt-4 pb-3 border-t border-white/10">
                  <div className="flex items-center px-3">
                    <div className="w-8 h-8 bg-white/14 rounded-full flex items-center justify-center border border-white/15">
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
                      className="block px-3 py-2 rounded-xl text-base font-medium text-green-50/90 hover:text-white hover:bg-white/10"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      Mi Perfil
                    </Link>
                    {user.role === "admin" && (
                      <Link
                        href="/admin"
                        className="block px-3 py-2 rounded-xl text-base font-medium text-green-50/90 hover:text-white hover:bg-white/10"
                        onClick={() => setIsMenuOpen(false)}
                      >
                        Panel Admin
                      </Link>
                    )}
                    <button
                      onClick={() => {
                        handleSignOut();
                        setIsMenuOpen(false);
                      }}
                      className="block w-full text-left px-3 py-2 rounded-xl text-base font-medium text-green-50/90 hover:text-white hover:bg-white/10"
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
