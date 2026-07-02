import { NextRequest, NextResponse } from "next/server";

interface ApiErrorResponseOptions {
  request: NextRequest;
  error: unknown;
  message: string;
  status: number;
  route: string;
  exposeError?: boolean;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function getRequestContext(request: NextRequest) {
  return {
    method: request.method,
    url: request.url,
    pathname: request.nextUrl.pathname,
    search: request.nextUrl.search,
    userAgent: request.headers.get("user-agent"),
    forwardedFor: request.headers.get("x-forwarded-for"),
    realIp: request.headers.get("x-real-ip"),
    referer: request.headers.get("referer"),
    requestId: request.headers.get("x-vercel-id") || request.headers.get("x-request-id"),
  };
}

export function logApiError(options: ApiErrorResponseOptions) {
  const errorMessage = getErrorMessage(options.error);

  if (options.status >= 500) {
    console.error("[API_ERROR_500] summary", {
      route: options.route,
      message: options.message,
      errorMessage,
      status: options.status,
      timestamp: new Date().toISOString(),
    });

    console.error("[API_ERROR_500] request", getRequestContext(options.request));

    if (options.error instanceof Error) {
      console.error("[API_ERROR_500] stack", {
        name: options.error.name,
        stack: options.error.stack,
      });

      if (options.error.cause) {
        console.error("[API_ERROR_500] cause", options.error.cause);
      }
    } else {
      console.error("[API_ERROR_500] raw", options.error);
    }

    return;
  }

  if (options.status >= 400) {
    console.warn("[API_ERROR_400]", errorMessage);
  }
}

export function extractErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export function resolveErrorStatus(
  message: string,
  rules: Array<{ match: string; status: number }>,
  fallback = 400,
): number {
  for (const rule of rules) {
    if (message.includes(rule.match)) return rule.status;
  }
  return fallback;
}

export function apiErrorResponse(options: ApiErrorResponseOptions) {
  logApiError(options);

  return NextResponse.json(
    {
      success: false,
      message: options.message,
      ...(options.exposeError ? { error: getErrorMessage(options.error) } : {}),
    },
    { status: options.status },
  );
}
