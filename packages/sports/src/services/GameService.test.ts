import { describe, expect, it, vi } from "vitest";
import { Game, type GameEvent } from "../entities/Game";
import { Venue } from "../entities/valueObjects/Venue";
import type { IGameRepository, ITeamRepository } from "../ports";
import { GameService } from "./GameService";
import type { StandingService } from "./StandingService";

function makeGame(events: Array<GameEvent & { _id?: string }> = []) {
  const game = new Game(
    "tournament",
    "division",
    new Venue("Cancha", "Montevideo"),
    new Date("2026-09-17T15:00:00.000Z"),
    "in_progress",
    "regular",
    "home",
    "away",
    [],
  );

  Object.assign(game, { events });
  return game;
}

function makeService(game: Game) {
  const gameRepo = {
    findById: vi.fn().mockResolvedValue(game),
    addEvent: vi.fn().mockResolvedValue(game),
    updateEvent: vi.fn().mockResolvedValue(game),
  } as unknown as IGameRepository;
  const teamRepo = {} as ITeamRepository;
  const standingService = { recalculateForTeam: vi.fn() } as unknown as StandingService;

  return { service: new GameService(gameRepo, teamRepo, standingService), gameRepo };
}

describe("GameService event time", () => {
  it("transporta una hora válida al crear el evento", async () => {
    const game = makeGame();
    const { service, gameRepo } = makeService(game);

    await service.addGameEvent(game.id!, {
      quarter: 1,
      time: "12:07",
      type: "touchdown",
      team: "home",
      player: "receiver",
      points: 6,
      details: { playType: "run" },
    });

    expect(gameRepo.addEvent).toHaveBeenCalledWith(
      game.id,
      expect.objectContaining({ time: "12:07" }),
    );
  });

  it("preserva la hora original al editar el evento", async () => {
    const game = makeGame([
      {
        _id: "event-1",
        quarter: 1,
        time: "12:07",
        type: "touchdown",
        team: "home",
        player: "receiver",
        points: 6,
      },
    ]);
    const { service, gameRepo } = makeService(game);

    await service.updateGameEvent(game.id!, "event-1", {
      quarter: 2,
      time: "18:45",
      type: "touchdown",
      team: "home",
      player: "receiver",
      points: 6,
      details: { playType: "pass", qb: "qb" },
    });

    expect(gameRepo.updateEvent).toHaveBeenCalledWith(
      game.id,
      "event-1",
      expect.objectContaining({ time: "12:07" }),
    );
  });

  it("rechaza horas fuera del formato HH:mm", () => {
    const game = makeGame();
    const { service } = makeService(game);

    expect(() =>
      service.buildValidatedGameEvent(game, {
        quarter: 1,
        time: "9:07",
        type: "touchdown",
        team: "home",
        player: "receiver",
        points: 6,
      }),
    ).toThrow("HH:mm");
  });
});
