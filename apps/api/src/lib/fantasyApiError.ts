import { NextRequest } from "next/server";
import { apiErrorResponse } from "./apiError";

interface Options {
  request: NextRequest;
  error: unknown;
  route: string;
  knownMessages?: string[];
  knownStatus?: number;
  fallback?: string;
}

function errorCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
}

export function fantasyApiErrorResponse({
  request,
  error,
  route,
  knownMessages = [],
  knownStatus = 400,
  fallback = "No pudimos completar la operación. Probá nuevamente en unos segundos.",
}: Options) {
  const internalMessage = error instanceof Error ? error.message : String(error);
  const knownMessage = knownMessages.find((message) => internalMessage === message || internalMessage.startsWith(message));
  const malformedRequest = error instanceof SyntaxError;
  const duplicateEmail = errorCode(error) === "P2002" && route.endsWith("/register");
  const message = malformedRequest
    ? "La solicitud no tiene un formato válido"
    : duplicateEmail
      ? "El email ya está registrado"
      : knownMessage || fallback;
  const status = malformedRequest ? 400 : duplicateEmail ? 409 : knownMessage ? knownStatus : 500;
  return apiErrorResponse({ request, error, message, status, route });
}
