import { describe, expect, it, vi } from "vitest";
import { AdminAnalyticsService } from "./AdminAnalyticsService";

describe("AdminAnalyticsService", () => {
  it("valida el alcance y reenvía torneo, división y sujeto al repositorio", async () => {
    const getAdminAnalytics = vi.fn().mockResolvedValue({ subject: "players" });
    const service = new AdminAnalyticsService(
      { exists: vi.fn().mockResolvedValue(true) } as never,
      { exists: vi.fn().mockResolvedValue(true) } as never,
      { getAdminAnalytics },
    );

    await expect(service.getAnalytics({ subject: "players", tournament: "t1", division: "d1" })).resolves.toEqual({ subject: "players" });
    expect(getAdminAnalytics).toHaveBeenCalledWith({ subject: "players", tournament: "t1", division: "d1" });
  });

  it("rechaza un torneo inexistente antes de consultar estadísticas", async () => {
    const getAdminAnalytics = vi.fn();
    const service = new AdminAnalyticsService(
      { exists: vi.fn().mockResolvedValue(false) } as never,
      { exists: vi.fn() } as never,
      { getAdminAnalytics },
    );

    await expect(service.getAnalytics({ subject: "teams", tournament: "missing" })).rejects.toThrow("campeonato inválido");
    expect(getAdminAnalytics).not.toHaveBeenCalled();
  });
});
