import { describe, expect, it, vi } from "vitest";
import { draftTurn, FantasyCompetitionService, type FantasyCompetitionRepository } from "./leagues";

describe("draftTurn", () => {
  it("alterna el orden de cada ronda en un draft serpiente", () => {
    expect([1, 2, 3, 4, 5, 6].map((pick) => draftTurn(pick, 3))).toEqual([
      { round: 1, memberIndex: 0 },
      { round: 1, memberIndex: 1 },
      { round: 1, memberIndex: 2 },
      { round: 2, memberIndex: 2 },
      { round: 2, memberIndex: 1 },
      { round: 2, memberIndex: 0 },
    ]);
  });
});

describe("FantasyCompetitionService", () => {
  it("normaliza los datos de creación antes de enviarlos al repositorio", async () => {
    const createLeague = vi.fn();
    const repository = { createLeague } as unknown as FantasyCompetitionRepository;
    const service = new FantasyCompetitionService(repository);

    await service.createLeague("user-1", { name: "  Liga   del  Flag  ", teamName: "  Violetas  " });

    expect(createLeague).toHaveBeenCalledWith({
      userId: "user-1",
      name: "Liga del Flag",
      teamName: "Violetas",
      maxMembers: 8,
      rosterSize: 12,
      turnSeconds: 90,
    });
  });

  it("rechaza códigos de invitación que no sean seguros ni válidos", () => {
    const service = new FantasyCompetitionService({} as FantasyCompetitionRepository);
    expect(() => service.joinLeague("user-1", { inviteCode: "<invalid>", teamName: "Violetas" }))
      .toThrow("Ingresá un código de invitación válido");
  });
});
