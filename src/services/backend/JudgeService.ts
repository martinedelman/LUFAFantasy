import connectToDatabase from "@/lib/mongodb";
import { JudgeModel } from "@/models";
import type { Judge } from "@/types";

function normalizeName(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export class JudgeService {
  async getJudgesByIds(ids: string[]): Promise<Judge[]> {
    await connectToDatabase();

    if (ids.length === 0) {
      return [];
    }

    const docs = await JudgeModel.find({ _id: { $in: ids } })
      .select("firstName lastName createdAt updatedAt")
      .lean();

    return docs.map((judge) => ({
      _id: judge._id?.toString(),
      firstName: judge.firstName,
      lastName: judge.lastName,
      createdAt: judge.createdAt,
      updatedAt: judge.updatedAt,
    }));
  }

  async listJudges(): Promise<Judge[]> {
    await connectToDatabase();

    const docs = await JudgeModel.find({})
      .sort({ lastName: 1, firstName: 1 })
      .select("firstName lastName createdAt updatedAt")
      .lean();

    return docs.map((judge) => ({
      _id: judge._id?.toString(),
      firstName: judge.firstName,
      lastName: judge.lastName,
      createdAt: judge.createdAt,
      updatedAt: judge.updatedAt,
    }));
  }

  async createJudge(data: { firstName: string; lastName: string }): Promise<Judge> {
    await connectToDatabase();

    const firstName = normalizeName(data.firstName || "");
    const lastName = normalizeName(data.lastName || "");

    if (!firstName || !lastName) {
      throw new Error("Nombre y apellido son requeridos");
    }

    const existingJudge = await JudgeModel.findOne({
      firstName: { $regex: new RegExp(`^${escapeRegExp(firstName)}$`, "i") },
      lastName: { $regex: new RegExp(`^${escapeRegExp(lastName)}$`, "i") },
    }).lean();

    if (existingJudge) {
      throw new Error("El juez ya existe");
    }

    const created = await JudgeModel.create({ firstName, lastName });

    return {
      _id: created._id.toString(),
      firstName: created.firstName,
      lastName: created.lastName,
      createdAt: created.createdAt,
      updatedAt: created.updatedAt,
    };
  }
}
