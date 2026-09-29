import { afterEach, describe, expect, it, vi } from "vitest";
import { centralAuthDestination } from "./centralAuth";

describe("centralAuthDestination", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("routes the legacy login entrypoint to LUFA and preserves a safe return URL", () => {
    vi.stubEnv("NEXT_PUBLIC_LUFA_URL", "https://lufa.com.uy");
    vi.stubEnv("NEXT_PUBLIC_FLAG_URL", "https://flag.lufa.com.uy");

    const destination = centralAuthDestination(
      "login",
      { returnTo: "https://flag.lufa.com.uy/teams" },
    );

    expect(destination.toString()).toBe(
      "https://lufa.com.uy/auth/login?returnTo=https%3A%2F%2Fflag.lufa.com.uy%2Fteams",
    );
  });

  it("preserves the verification token when the central flow is selected", () => {
    vi.stubEnv("NEXT_PUBLIC_LUFA_URL", "https://lufa.com.uy");
    vi.stubEnv("NEXT_PUBLIC_FLAG_URL", "https://flag.lufa.com.uy");

    const destination = centralAuthDestination("verify", {
      token: "registration-token",
    });

    expect(destination.pathname).toBe("/auth/verify");
    expect(destination.searchParams.get("token")).toBe("registration-token");
    expect(destination.searchParams.get("returnTo")).toBe(
      "https://flag.lufa.com.uy/",
    );
  });

  it("rejects external return URLs", () => {
    vi.stubEnv("NEXT_PUBLIC_LUFA_URL", "https://lufa.com.uy");
    vi.stubEnv("NEXT_PUBLIC_FLAG_URL", "https://flag.lufa.com.uy");

    const destination = centralAuthDestination("signup", {
      returnTo: "https://evil.example/phishing",
    });

    expect(destination.searchParams.get("returnTo")).toBe(
      "https://flag.lufa.com.uy/",
    );
  });
});
