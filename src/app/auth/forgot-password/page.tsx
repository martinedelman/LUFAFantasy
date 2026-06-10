"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import InlineFeedback from "@/components/InlineFeedback";
import LoadingSpinner from "@/components/LoadingSpinner";

type Step = "request" | "confirm";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const validateEmail = (value: string) => {
    if (!value.trim()) return "Este campo es obligatorio.";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) return "";
    return "Ingresá un email válido.";
  };

  const validateResetFields = (values = { code, password, confirmPassword }) => {
    const nextErrors: Record<string, string> = {};

    if (!values.code) {
      nextErrors.code = "Este campo es obligatorio.";
    } else if (!/^\d{6}$/.test(values.code)) {
      nextErrors.code = "El código debe tener 6 números.";
    }

    if (!values.password) {
      nextErrors.password = "Este campo es obligatorio.";
    } else if (values.password.length < 6) {
      nextErrors.password = "La contraseña debe tener al menos 6 caracteres.";
    }

    if (!values.confirmPassword) {
      nextErrors.confirmPassword = "Este campo es obligatorio.";
    } else if (values.password !== values.confirmPassword) {
      nextErrors.confirmPassword = "Las contraseñas no coinciden.";
    }

    return nextErrors;
  };

  const requestCode = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const emailError = validateEmail(email);
    setFieldErrors(emailError ? { email: emailError } : {});

    if (emailError) {
      setError("Revisá el email antes de pedir el código.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });
      const payload = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !payload.success) {
        setError(payload.message || "No se pudo enviar el código");
        return;
      }

      setMessage(payload.message || "Te enviamos un código de recuperación.");
      setStep("confirm");
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const isRequestReady = !validateEmail(email);
  const resetFieldErrors = validateResetFields();
  const isResetReady = Object.keys(resetFieldErrors).length === 0;

  const renderFieldError = (fieldName: string) =>
    fieldErrors[fieldName] ? (
      <span id={`${fieldName}-error`} className="mt-1 block text-xs font-medium text-red-600">
        {fieldErrors[fieldName]}
      </span>
    ) : null;

  const resetPassword = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextFieldErrors = validateResetFields();
    setFieldErrors(nextFieldErrors);

    if (Object.keys(nextFieldErrors).length > 0) {
      setError("Revisá los campos marcados antes de actualizar la contraseña.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch("/api/auth/password-reset/confirm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code,
          password,
        }),
      });
      const payload = (await response.json()) as { success: boolean; message?: string };

      if (!response.ok || !payload.success) {
        setError(payload.message || "No se pudo restaurar la contraseña");
        return;
      }

      setMessage("Contraseña actualizada correctamente. Ya podés iniciar sesión.");
      setTimeout(() => {
        router.push("/auth/signin");
      }, 1200);
    } catch {
      setError("Error de conexión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <span className="text-4xl">🏈</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Recuperar contraseña</h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {step === "request" ? "Te enviaremos un código de verificación." : "Ingresá el código y tu nueva contraseña."}
          </p>
        </div>

        {error && <InlineFeedback variant="error" title="No pudimos continuar" message={error} />}
        {message && <InlineFeedback variant="success" title="Revisá tu correo" message={message} />}

        {step === "request" ? (
          <form className="mt-8 space-y-6" onSubmit={requestCode}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Correo Electrónico <span className="text-red-600">*</span>
                <span className="ml-1 text-xs font-normal text-gray-500">Obligatorio</span>
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value);
                  setFieldErrors((prev) => ({ ...prev, email: validateEmail(event.target.value) }));
                  if (error) setError("");
                }}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
                className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${
                  fieldErrors.email ? "border-red-300 bg-red-50" : "border-gray-300"
                }`}
                placeholder="tu@email.com"
              />
              {renderFieldError("email")}
            </div>

            <button
              type="submit"
              disabled={loading || !isRequestReady}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" color="white" />
                  <span>Enviando código...</span>
                </div>
              ) : (
                "Enviar código"
              )}
            </button>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={resetPassword}>
            <div className="space-y-4">
              <div>
                <label htmlFor="code" className="block text-sm font-medium text-gray-700">
                  Código de verificación <span className="text-red-600">*</span>
                  <span className="ml-1 text-xs font-normal text-gray-500">Obligatorio</span>
                </label>
                <input
                  id="code"
                  name="code"
                  type="text"
                  inputMode="numeric"
                  required
                  value={code}
                  onChange={(event) => {
                    const nextValue = event.target.value.replace(/\D/g, "").slice(0, 6);
                    setCode(nextValue);
                    setFieldErrors(validateResetFields({ code: nextValue, password, confirmPassword }));
                    if (error) setError("");
                  }}
                  aria-invalid={Boolean(fieldErrors.code)}
                  aria-describedby={fieldErrors.code ? "code-error" : undefined}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${
                    fieldErrors.code ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="123456"
                />
                <span className="mt-1 block text-xs text-gray-500">Faltan {Math.max(0, 6 - code.length)} números.</span>
                {renderFieldError("code")}
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Nueva contraseña <span className="text-red-600">*</span>
                  <span className="ml-1 text-xs font-normal text-gray-500">Obligatorio</span>
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setPassword(nextValue);
                    setFieldErrors(validateResetFields({ code, password: nextValue, confirmPassword }));
                    if (error) setError("");
                  }}
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${
                    fieldErrors.password ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="••••••••"
                />
                {renderFieldError("password")}
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirmar contraseña <span className="text-red-600">*</span>
                  <span className="ml-1 text-xs font-normal text-gray-500">Obligatorio</span>
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(event) => {
                    const nextValue = event.target.value;
                    setConfirmPassword(nextValue);
                    setFieldErrors(validateResetFields({ code, password, confirmPassword: nextValue }));
                    if (error) setError("");
                  }}
                  aria-invalid={Boolean(fieldErrors.confirmPassword)}
                  aria-describedby={fieldErrors.confirmPassword ? "confirmPassword-error" : undefined}
                  className={`mt-1 appearance-none relative block w-full px-3 py-2 border placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-green-500 focus:border-green-500 focus:z-10 sm:text-sm ${
                    fieldErrors.confirmPassword ? "border-red-300 bg-red-50" : "border-gray-300"
                  }`}
                  placeholder="••••••••"
                />
                {renderFieldError("confirmPassword")}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !isResetReady}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center gap-2">
                  <LoadingSpinner size="sm" color="white" />
                  <span>Actualizando...</span>
                </div>
              ) : (
                "Actualizar contraseña"
              )}
            </button>
          </form>
        )}

        <div className="text-center">
          <Link href="/auth/signin" className="text-sm font-medium text-green-600 hover:text-green-500">
            Volver a iniciar sesión
          </Link>
        </div>
      </div>
    </div>
  );
}
