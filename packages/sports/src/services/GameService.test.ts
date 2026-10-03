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

describe("GameService event rules by modality", () => {
  const tackleGame = () => {
    const game = makeGame();
    Object.assign(game, { tournament: { _id: "tournament", name: "Tackle", modality: "tackle" } });
    return game;
  };
  const base = { quarter: 1, team: "home", player: "p1" } as const;

  it("en tackle fija los puntos del evento sin importar lo que mande el cliente", () => {
    const { service } = makeService(tackleGame());

    expect(service.buildValidatedGameEvent(tackleGame(), { ...base, type: "field_goal", points: 7 }).points).toBe(3);
    expect(service.buildValidatedGameEvent(tackleGame(), { ...base, type: "pat_kick" }).points).toBe(1);
    expect(service.buildValidatedGameEvent(tackleGame(), { ...base, type: "fumble", points: 6 }).points).toBe(0);
    expect(service.buildValidatedGameEvent(tackleGame(), { ...base, type: "kick_return_td" }).description).toBe(
      "TD por retorno de kickoff (+6)",
    );
  });

  it("rechaza eventos que no existen en la modalidad", () => {
    const { service } = makeService(tackleGame());
    expect(() => service.buildValidatedGameEvent(tackleGame(), { ...base, type: "extra_point", points: 1 })).toThrow(
      "Evento no válido para tackle",
    );

    const flagGame = makeGame();
    expect(() => service.buildValidatedGameEvent(flagGame, { ...base, type: "fumble_return_td" })).toThrow(
      "Evento no válido para flag",
    );
  });

  it("en flag mantiene los puntos que carga el juez", () => {
    const flagGame = makeGame();
    const { service } = makeService(flagGame);

    expect(service.buildValidatedGameEvent(flagGame, { ...base, type: "extra_point", points: 2 }).points).toBe(2);
    expect(service.buildValidatedGameEvent(flagGame, { ...base, type: "touchdown", points: -3 }).points).toBe(0);
    expect(service.buildValidatedGameEvent(flagGame, { ...base, type: "interception" }).points).toBeUndefined();
    expect(service.buildValidatedGameEvent(flagGame, { ...base, type: "quarter_end" }).description).toBe("Fin de mitad");
    expect(service.buildValidatedGameEvent(tackleGame(), { ...base, type: "quarter_end" }).description).toBe("Fin de cuarto");
  });

  it("solo el safety de flag se puede guardar sin anotador cuando tiene QB", () => {
    const flagGame = makeGame();
    const { service } = makeService(flagGame);
    const safety = { quarter: 1, team: "home", type: "safety" as const, points: 2, details: { qb: "qb1" } };

    expect(service.buildValidatedGameEvent(flagGame, safety).player).toBeUndefined();
    expect(() => service.buildValidatedGameEvent(tackleGame(), safety)).toThrow("El jugador es requerido");
  });
});

describe("GameService server-side scoring details", () => {
  const tackleGame = () => {
    const game = makeGame();
    Object.assign(game, { tournament: { _id: "tournament", name: "Tackle", modality: "tackle" } });
    return game;
  };

  it("los eventos de control no suman puntos en tackle", () => {
    const { service } = makeService(tackleGame());
    expect(service.buildValidatedGameEvent(tackleGame(), { quarter: 2, type: "quarter_end", team: "home", points: 100 }).points).toBe(0);
    expect(
      service.buildValidatedGameEvent(tackleGame(), { quarter: 2, type: "penalty", team: "home", player: "p1", points: 5 }).points,
    ).toBe(0);
  });

  it("el crédito del QB se calcula con los puntos del servidor", () => {
    const { service } = makeService(tackleGame());
    const touchdown = service.buildValidatedGameEvent(tackleGame(), {
      quarter: 1, type: "touchdown", team: "home", player: "wr", points: 7, details: { playType: "pass", qb: "qb", qbStatValue: 7 },
    });
    expect([touchdown.points, (touchdown.details as { qbStatValue: number }).qbStatValue]).toEqual([6, 6]);

    const pickSix = service.buildValidatedGameEvent(tackleGame(), {
      quarter: 1, type: "pick_six", team: "home", player: "cb", details: { qb: "qb", qbStatValue: 0 },
    });
    expect((pickSix.details as { qbStatValue: number }).qbStatValue).toBe(-6);
  });
});
