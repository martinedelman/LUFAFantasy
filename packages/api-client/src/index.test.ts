import { describe, expect, it, vi } from "vitest";
import { ApiClient } from "./index";

describe("ApiClient", () => {
  it("preserves credentials and unwraps the existing API envelope", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: true, data: { id: "game-1" } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    const client = new ApiClient({ baseUrl: "https://api.testing.lufa.test/api/", fetch: fetchMock });

    await expect(client.request<{ id: string }>("/games/game-1")).resolves.toEqual({ id: "game-1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.testing.lufa.test/api/games/game-1",
      expect.objectContaining({ credentials: "include" }),
    );
  });

  it("surfaces the API error message", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(JSON.stringify({ success: false, message: "No autorizado" }), {
        status: 401,
        statusText: "Unauthorized",
      }),
    );
    const client = new ApiClient({ fetch: fetchMock });

    await expect(client.request("auth/me")).rejects.toThrow("No autorizado");
  });
});
