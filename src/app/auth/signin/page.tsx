"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

export default function SignInPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const router = useRouter();
  const { signIn } = useAuth();

  const validateField = (name: string, value: string) => {
    const trimmed = value.trim();

    if (!trimmed) {
      return "Este campo es obligatorio.";
    }

    if (name === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return "Ingresá un email válido.";
    }

    if (name === "password" && value.length < 6) {
      return "La contraseña debe tener al menos 6 caracteres.";
    }

    return "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors = {
      email: validateField("email", formData.email),
      password: validateField("password", formData.password),
    };
    setFieldErrors(nextFieldErrors);

    if (Object.values(nextFieldErrors).some(Boolean)) {
      setError("Revisá los campos marcados antes de iniciar sesión.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signIn(formData.email, formData.password);

      if (!result.success) {
        setError(result.error || "Error de autenticación");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = e.target.value;
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: nextValue,
    }));
    setFieldErrors((prev) => ({
      ...prev,
      [e.target.name]: validateField(e.target.name, nextValue),
    }));
    if (error) setError("");
  };

  const isFormReady =
    formData.email.trim().length > 0 &&
    formData.password.length >= 6 &&
    !validateField("email", formData.email) &&
    !validateField("password", formData.password);

  const renderFieldError = (fieldName: "email" | "password") =>
    fieldErrors[fieldName] ? (
      <span id={`${fieldName}-error`} className="mt-1 block text-xs font-medium text-red-600">
        {fieldErrors[fieldName]}
      </span>
    ) : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <span className="text-4xl">🏈</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Iniciar Sesión</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Accede a tu cuenta en LUFA Flag</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <InlineFeedback variant="error" title="No pudimos iniciar sesión" message={error} />}

          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${
                  fieldErrors.email ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="tu@email.com"
              />
              {renderFieldError("email")}
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Contraseña
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${
                  fieldErrors.password ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="••••••••"
              />
              {renderFieldError("password")}
              <div className="mt-2 text-right">
                <Link href="/auth/forgot-password" className="text-sm font-medium text-green-600 hover:text-green-500">
                  ¿Olvidaste tu contraseña?
                </Link>
              </div>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !isFormReady}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" color="white" />
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                "Iniciar Sesión"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿No tienes una cuenta?{" "}
              <Link href="/auth/signup" className="font-medium text-green-600 hover:text-green-500">
                Regístrate aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
