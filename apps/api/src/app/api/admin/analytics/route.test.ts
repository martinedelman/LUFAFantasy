import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: vi.fn(),
  verifyAdmin: vi.fn(),
  getAnalytics: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getSessionTokenFromRequest: mocks.token }));
vi.mock("@/bootstrap/serviceContainer", () => ({
  serviceContainer: {
    authService: { verifyAdmin: mocks.verifyAdmin },
    adminAnalyticsService: { getAnalytics: mocks.getAnalytics },
  },
}));

import { GET } from "./route";

describe("GET /api/admin/analytics", () => {
  beforeEach(() => vi.resetAllMocks());

  it("requiere una sesión administrativa", async () => {
    mocks.token.mockReturnValue(undefined);
    const response = await GET(new NextRequest("http://localhost/api/admin/analytics"));
    expect(response.status).toBe(401);

    mocks.token.mockReturnValue("token");
    mocks.verifyAdmin.mockResolvedValue(false);
    const forbidden = await GET(new NextRequest("http://localhost/api/admin/analytics"));
    expect(forbidden.status).toBe(403);
  });

  it("valida el sujeto y devuelve datos sin caché", async () => {
    mocks.token.mockReturnValue("token");
    mocks.verifyAdmin.mockResolvedValue(true);
    const invalid = await GET(new NextRequest("http://localhost/api/admin/analytics?subject=invalid"));
    expect(invalid.status).toBe(400);

    mocks.getAnalytics.mockResolvedValue({ subject: "players" });
    const response = await GET(
      new NextRequest("http://localhost/api/admin/analytics?subject=players&tournament=t1&division=d1"),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(mocks.getAnalytics).toHaveBeenCalledWith({ subject: "players", tournament: "t1", division: "d1" });
  });
});
