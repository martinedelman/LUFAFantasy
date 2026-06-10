"use client";
import { useState } from "react";
import Link from "next/link";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";
import { useAuth } from "@/hooks/useAuth";

export default function SignUpPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const { signUp } = useAuth();

  const validateForm = (data = formData) => {
    const nextErrors: Record<string, string> = {};

    if (!data.name.trim()) {
      nextErrors.name = "Este campo es obligatorio.";
    } else if (data.name.trim().length < 3) {
      nextErrors.name = "Ingresá nombre y apellido o un nombre reconocible.";
    }

    if (!data.email.trim()) {
      nextErrors.email = "Este campo es obligatorio.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim())) {
      nextErrors.email = "Ingresá un email válido.";
    }

    if (!data.password) {
      nextErrors.password = "Este campo es obligatorio.";
    } else if (data.password.length < 6) {
      nextErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (!data.confirmPassword) {
      nextErrors.confirmPassword = "Este campo es obligatorio.";
    } else if (data.password !== data.confirmPassword) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    return nextErrors;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nextFieldErrors = validateForm();
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Revisá los campos marcados antes de crear la cuenta.");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await signUp(formData.name, formData.email, formData.password);

      if (!result.success) {
        setError(result.error || "Error en el registro");
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nextFormData = {
      ...formData,
      [e.target.name]: e.target.value,
    };
    setFormData(nextFormData);
    setFieldErrors(validateForm(nextFormData));
    if (error) setError("");
  };

  const currentFormErrors = validateForm();
  const isFormReady = Object.keys(currentFormErrors).length === 0;

  const inputClassName = (fieldName: string) =>
    `mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${
      fieldErrors[fieldName] ? "border-red-300 bg-red-50" : "border-gray-300"
    }`;

  const renderFieldError = (fieldName: string) =>
    fieldErrors[fieldName] ? (
      <span id={`${fieldName}-error`} className="mt-1 block text-xs font-medium text-red-600">
        {fieldErrors[fieldName]}
      </span>
    ) : null;

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Revisá tu correo</h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Te enviamos un link y un código para activar tu cuenta.
              <br />
              Después de verificarla vas a entrar automáticamente.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <span className="text-4xl">🏈</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Crear Cuenta</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Únete a LUFA Flag</p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && <InlineFeedback variant="error" title="No pudimos crear la cuenta" message={error} />}

          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Nombre Completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
                className={inputClassName("name")}
                placeholder="Juan Pérez"
              />
              {renderFieldError("name")}
            </div>

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
                className={inputClassName("email")}
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
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? "password-error" : undefined}
                className={inputClassName("password")}
                placeholder="••••••••"
              />
              {renderFieldError("password")}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirmar Contraseña
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                className={inputClassName("confirmPassword")}
                placeholder="••••••••"
              />
              {renderFieldError("confirmPassword")}
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
                  <span>Creando cuenta...</span>
                </div>
              ) : (
                "Crear Cuenta"
              )}
            </button>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-600">
              ¿Ya tienes una cuenta?{" "}
              <Link href="/auth/signin" className="font-medium text-green-600 hover:text-green-500">
                Inicia sesión aquí
              </Link>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
}
