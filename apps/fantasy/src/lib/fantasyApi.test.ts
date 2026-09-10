import { afterEach, describe, expect, it, vi } from "vitest";
import { fantasyRequest } from "./fantasyApi";

describe("fantasyRequest", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("returns a clear message when the rewrite is unavailable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<!doctype html>", {
      status: 404,
      headers: { "content-type": "text/html" },
    })));
    await expect(fantasyRequest("/auth/register")).rejects.toThrow(
      "El servicio de Fantasy no está disponible. Verificá que la API esté iniciada.",
    );
  });

  it("does not expose non-JSON server responses", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("database connection secret", {
      status: 500,
      headers: { "content-type": "text/plain" },
    })));
    await expect(fantasyRequest("/auth/register")).rejects.toThrow(
      "No pudimos completar la operación. Probá nuevamente en unos segundos.",
    );
  });

  it("keeps safe validation messages returned by the API", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({
      success: false,
      message: "La contraseña debe tener al menos 8 caracteres",
    }, { status: 400 })));
    await expect(fantasyRequest("/auth/register")).rejects.toThrow("La contraseña debe tener");
  });
});
