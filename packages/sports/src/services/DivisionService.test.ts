import { describe, expect, it, vi } from "vitest";
import type { Division } from "../entities/Division";
import type { IDivisionRepository, ITournamentRepository } from "../ports";
import type { Tournament } from "../entities/Tournament";
import { DivisionService } from "./DivisionService";

function repository(): IDivisionRepository {
  return {
    findById: vi.fn(),
    findAll: vi.fn().mockResolvedValue([]),
    create: vi.fn(async (division: Partial<Division>) => division as Division),
    update: vi.fn(),
    delete: vi.fn(),
    exists: vi.fn(),
    findByTournament: vi.fn(),
    findByCategory: vi.fn(),
    existsWithName: vi.fn(),
  };
}

function tournaments(found: Partial<Tournament> | null = null): ITournamentRepository {
  return { findById: vi.fn().mockResolvedValue(found) } as unknown as ITournamentRepository;
}

describe("DivisionService", () => {
  it("aplica reglas del dominio usando un puerto inyectado", async () => {
    const port = repository();
    const service = new DivisionService(port, tournaments());

    const division = await service.createDivision({ name: "Mayores", category: "mixto", maxTeams: 8 });

    expect(division.name).toBe("Mayores");
    expect(port.create).toHaveBeenCalledOnce();
  });

  it("no persiste una división inválida", async () => {
    const port = repository();
    const service = new DivisionService(port, tournaments());

    await expect(service.createDivision({ name: "", category: "mixto" })).rejects.toThrow();
    expect(port.create).not.toHaveBeenCalled();
  });

  it("rechaza un torneo de otra modalidad", async () => {
    const port = repository();
    const service = new DivisionService(port, tournaments({ name: "Apertura", modality: "flag" }));

    await expect(
      service.createDivision({ name: "Primera", category: "mixto", tournament: "t1", modality: "tackle" }),
    ).rejects.toThrow("no pertenece a la modalidad tackle");
    expect(port.create).not.toHaveBeenCalled();
  });

  it("acepta un torneo de la misma modalidad", async () => {
    const port = repository();
    const service = new DivisionService(port, tournaments({ name: "Apertura", modality: "tackle" }));

    await service.createDivision({ name: "Primera", category: "mixto", tournament: "t1", modality: "tackle" });
    expect(port.create).toHaveBeenCalledOnce();
  });
});
