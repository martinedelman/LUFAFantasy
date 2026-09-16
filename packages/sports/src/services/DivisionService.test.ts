import { describe, expect, it, vi } from "vitest";
import type { Division } from "../entities/Division";
import type { IDivisionRepository } from "../ports";
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

describe("DivisionService", () => {
  it("aplica reglas del dominio usando un puerto inyectado", async () => {
    const port = repository();
    const service = new DivisionService(port);

    const division = await service.createDivision({ name: "Mayores", category: "mixto", maxTeams: 8 });

    expect(division.name).toBe("Mayores");
    expect(port.create).toHaveBeenCalledOnce();
  });

  it("no persiste una división inválida", async () => {
    const port = repository();
    const service = new DivisionService(port);

    await expect(service.createDivision({ name: "", category: "mixto" })).rejects.toThrow();
    expect(port.create).not.toHaveBeenCalled();
  });
});
