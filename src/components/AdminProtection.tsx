"use client";
import { useAuth } from "@/hooks/useAuth";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

interface AdminProtectionProps {
  children: React.ReactNode;
  fallbackMessage?: string;
}

export default function AdminProtection({
  children,
  fallbackMessage = "Solo los administradores pueden acceder a esta página.",
}: AdminProtectionProps) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/auth/signin");
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando permisos...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center">
          <div className="text-red-500 text-5xl mb-4">🔒</div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">Acceso requerido</h2>
          <p className="text-gray-600 mb-4">Debes iniciar sesión para acceder a esta página.</p>
          <button
            onClick={() => router.push("/auth/signin")}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    );
  }

  if (user.role !== "admin") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="bg-white p-8 rounded-lg shadow text-center max-w-md">
          <div className="text-yellow-500 text-5xl mb-4">⚠️</div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">Acceso denegado</h2>
          <p className="text-gray-600 mb-4">{fallbackMessage}</p>
          <div className="space-y-2">
            <p className="text-sm text-gray-500">
              Usuario actual: <span className="font-medium">{user.name}</span>
            </p>
            <p className="text-sm text-gray-500">
              Rol: <span className="font-medium capitalize">{user.role}</span>
            </p>
          </div>
          <div className="mt-6 space-x-3">
            <button
              onClick={() => router.push("/")}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors"
            >
              Ir al Inicio
            </button>
            <button
              onClick={() => router.back()}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
            >
              Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
