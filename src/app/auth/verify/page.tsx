"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import LoadingSpinner from "@/components/LoadingSpinner";

function VerifyRegistrationForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";
  const [digits, setDigits] = useState(Array(6).fill(""));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const code = digits.join("");

  const focusInput = (index: number) => {
    inputRefs.current[index]?.focus();
    inputRefs.current[index]?.select();
  };

  const applyDigits = (value: string, startIndex: number) => {
    const nextDigits = [...digits];
    const pastedDigits = value.replace(/\D/g, "").slice(0, 6 - startIndex);

    pastedDigits.split("").forEach((digit, offset) => {
      nextDigits[startIndex + offset] = digit;
    });

    setDigits(nextDigits);

    const nextFocusIndex = Math.min(startIndex + pastedDigits.length, 5);
    window.requestAnimationFrame(() => focusInput(nextFocusIndex));
  };

  const handleDigitChange = (index: number, value: string) => {
    if (value.length > 1) {
      applyDigits(value, index);
      return;
    }

    const digit = value.replace(/\D/g, "");
    const nextDigits = [...digits];
    nextDigits[index] = digit;
    setDigits(nextDigits);

    if (digit && index < 5) {
      window.requestAnimationFrame(() => focusInput(index + 1));
    }
  };

  const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault();
      const nextDigits = [...digits];
      nextDigits[index - 1] = "";
      setDigits(nextDigits);
      window.requestAnimationFrame(() => focusInput(index - 1));
    }

    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault();
      focusInput(index - 1);
    }

    if (event.key === "ArrowRight" && index < 5) {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    applyDigits(event.clipboardData.getData("text"), index);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/verify-registration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, code }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setError(data.message || "No pudimos verificar la cuenta");
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

  return (
    <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">{error}</div>
      )}

      {!token && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-700 px-4 py-3 rounded-md text-sm">
          Abrí el link que te enviamos por email para verificar tu cuenta.
        </div>
      )}

      <div>
        <label htmlFor="otp-0" className="block text-sm font-medium text-gray-700 text-center">
          Código de verificación
        </label>
        <div className="mt-4 flex justify-center gap-2 sm:gap-3">
          {digits.map((digit, index) => (
            <input
              key={index}
              ref={(element) => {
                inputRefs.current[index] = element;
              }}
              id={`otp-${index}`}
              name={index === 0 ? "code" : undefined}
              type="text"
              inputMode="numeric"
              autoComplete={index === 0 ? "one-time-code" : "off"}
              required
              maxLength={1}
              value={digit}
              onChange={(event) => handleDigitChange(index, event.target.value)}
              onKeyDown={(event) => handleKeyDown(index, event)}
              onPaste={(event) => handlePaste(index, event)}
              className="h-12 w-11 rounded-md border border-gray-300 bg-white text-center text-xl font-semibold text-gray-900 shadow-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500 sm:h-14 sm:w-12 sm:text-2xl"
              aria-label={`Dígito ${index + 1} del código`}
            />
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !token || code.length < 6}
        className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? (
          <div className="flex items-center justify-center gap-2">
            <LoadingSpinner size="sm" color="white" />
            <span>Verificando...</span>
          </div>
        ) : (
          "Verificar cuenta"
        )}
      </button>

      <div className="text-center">
        <Link href="/auth/signin" className="font-medium text-green-600 hover:text-green-500 text-sm">
          Volver al login
        </Link>
      </div>
    </form>
  );
}

export default function VerifyRegistrationPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <div className="flex justify-center">
            <span className="text-4xl">🏈</span>
          </div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">Verificar cuenta</h2>
          <p className="mt-2 text-center text-sm text-gray-600">Ingresá el código que recibiste por email</p>
        </div>

        <Suspense>
          <VerifyRegistrationForm />
        </Suspense>
      </div>
    </div>
  );
}
