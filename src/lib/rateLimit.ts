import { NextRequest, NextResponse } from "next/server";

interface RateLimitConfig {
  key: string;
  limit: number;
  windowMs: number;
}

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return request.headers.get("x-real-ip") || "unknown";
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}

export function checkRateLimit(request: NextRequest, config: RateLimitConfig) {
  const now = Date.now();
  const ip = getClientIp(request);
  const storeKey = `${config.key}:${ip}`;
  const currentEntry = rateLimitStore.get(storeKey);

  if (rateLimitStore.size > 1000) {
    pruneExpiredEntries(now);
  }

  if (!currentEntry || currentEntry.resetAt <= now) {
    const resetAt = now + config.windowMs;
    rateLimitStore.set(storeKey, {
      count: 1,
      resetAt,
    });

    return {
      allowed: true,
      remaining: config.limit - 1,
      resetAt,
    };
  }

  if (currentEntry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: currentEntry.resetAt,
    };
  }

  currentEntry.count += 1;
  rateLimitStore.set(storeKey, currentEntry);

  return {
    allowed: true,
    remaining: config.limit - currentEntry.count,
    resetAt: currentEntry.resetAt,
  };
}

export function rateLimitResponse(resetAt: number) {
  const retryAfterSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));

  return NextResponse.json(
    {
      success: false,
      message: "Demasiados intentos. Probá de nuevo en un minuto.",
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
