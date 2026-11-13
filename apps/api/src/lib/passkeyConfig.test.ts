import { describe, expect, it } from "vitest";
import { resolvePasskeyConfig } from "./passkeyConfig";

describe("resolvePasskeyConfig", () => {
  it("usa lufa.com.uy y sus subdominios en producción", () => {
    const config = resolvePasskeyConfig({ NODE_ENV: "production", VERCEL_ENV: "production" }, true);
    expect(config.rpId).toBe("lufa.com.uy");
    expect(config.origins).toEqual([
      "https://lufa.com.uy",
      "https://www.lufa.com.uy",
      "https://flag.lufa.com.uy",
      "https://tackle.lufa.com.uy",
    ]);
    expect(config.enabled).toBe(true);
  });

  it("usa localhost en desarrollo", () => {
    const config = resolvePasskeyConfig({ NODE_ENV: "development" }, true);
    expect(config.rpId).toBe("localhost");
    expect(config.origins).toContain("http://localhost:3003");
  });

  it("en previews toma el host del front institucional", () => {
    const config = resolvePasskeyConfig(
      { NODE_ENV: "production", VERCEL_ENV: "preview", NEXT_PUBLIC_LUFA_URL: "https://testing-lufa.vercel.app/" },
      true,
    );
    expect(config.rpId).toBe("testing-lufa.vercel.app");
    expect(config.origins).toEqual(["https://testing-lufa.vercel.app"]);
  });

  it("respeta la configuración explícita y descarta orígenes de otro dominio", () => {
    const config = resolvePasskeyConfig(
      { WEBAUTHN_RP_ID: "Lufa.com.uy", WEBAUTHN_ORIGINS: "https://flag.lufa.com.uy/, https://evil.example" },
      true,
    );
    expect(config.rpId).toBe("lufa.com.uy");
    expect(config.origins).toEqual(["https://flag.lufa.com.uy"]);
  });

  it("queda deshabilitado sin base PostgreSQL o sin orígenes válidos", () => {
    expect(resolvePasskeyConfig({ NODE_ENV: "development" }, false).enabled).toBe(false);
    expect(resolvePasskeyConfig({ WEBAUTHN_RP_ID: "lufa.com.uy", WEBAUTHN_ORIGINS: "https://evil.example" }, true).enabled).toBe(false);
  });
});
