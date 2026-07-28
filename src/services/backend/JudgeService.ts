import { getAuxiliaryRepository } from "@/repositories/auxiliary";
import type { Judge } from "@/types";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export class JudgeService {
  private auxiliaryRepo = getAuxiliaryRepository();

  async getJudgesByIds(ids: string[]): Promise<Judge[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.auxiliaryRepo.findJudgesByIds(ids);
  }

  async listJudges(): Promise<Judge[]> {
    return await this.auxiliaryRepo.listJudges();
  }

  async createJudge(data: { firstName: string; lastName: string }): Promise<Judge> {
    const firstName = normalizeName(data.firstName || "");
    const lastName = normalizeName(data.lastName || "");

    if (!firstName || !lastName) {
      throw new Error("Nombre y apellido son requeridos");
    }

    const existingJudge = await this.auxiliaryRepo.findJudgeByNormalizedName(firstName, lastName);

    if (existingJudge) {
      throw new Error("El juez ya existe");
    }

    return await this.auxiliaryRepo.createJudge(firstName, lastName);
  }
}
