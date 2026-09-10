export interface Judge {
  _id?: string;
  firstName: string;
  lastName: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface JudgeRepositoryPort {
  findJudgesByIds(ids: string[]): Promise<Judge[]>;
  listJudges(): Promise<Judge[]>;
  findJudgeByNormalizedName(firstName: string, lastName: string): Promise<Judge | null>;
  createJudge(firstName: string, lastName: string): Promise<Judge>;
}

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export class JudgeService {
  constructor(private readonly auxiliaryRepo: JudgeRepositoryPort) {}

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
