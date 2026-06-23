import mongoose from "mongoose";
import { GameEventCorrectionModel, type GameEventCorrectionOperation } from "@/models/GameEventCorrection";
import { GameEventModel } from "@/models/GameEvent";
import connectToDatabase from "@/lib/mongodb";
import type { Game, GameEvent, GameEventType } from "@/entities/Game";
import type { User } from "@/entities/User";
import { GameService } from "./GameService";

export interface GameEventCorrectionInput {
  quarter: number;
  type: GameEventType;
  team: string;
  player?: string;
  points?: number;
  details?: unknown;
}

export class GameEventCorrectionService {
  private gameService = new GameService();

  async createPendingCorrection(data: {
    game: Game;
    eventId?: string;
    operation: GameEventCorrectionOperation;
    proposedEvent?: GameEventCorrectionInput;
    requestedBy: User;
  }) {
    await connectToDatabase();

    if (data.game.status !== "completed") {
      throw new Error("Solo los partidos finalizados requieren aprobación de correcciones");
    }

    if (data.operation !== "create" && !data.eventId) {
      throw new Error("El evento a corregir es requerido");
    }

    const originalEvent =
      data.eventId && data.operation !== "create"
        ? await GameEventModel.findOne({ _id: data.eventId, game: data.game.id }).lean().exec()
        : null;

    if (data.operation !== "create" && !originalEvent) {
      throw new Error("Evento no encontrado");
    }

    const proposedEvent = data.proposedEvent
      ? this.gameService.buildValidatedGameEvent(data.game, data.proposedEvent)
      : undefined;

    const correction = await GameEventCorrectionModel.create({
      game: data.game.id,
      event: data.eventId,
      operation: data.operation,
      status: "pending",
      proposedEvent: proposedEvent ? this.toStoredPayload(proposedEvent) : undefined,
      originalEvent: originalEvent ? this.toStoredPayload(originalEvent as unknown as GameEventCorrectionInput) : undefined,
      requestedBy: data.requestedBy.id,
      requestedByName: data.requestedBy.name,
      requestedByEmail: data.requestedBy.email,
    });

    return correction;
  }

  async listPendingCorrections() {
    await connectToDatabase();

    return await GameEventCorrectionModel.find({ status: "pending" })
      .populate({
        path: "game",
        populate: [
          { path: "homeTeam", select: "name shortName" },
          { path: "awayTeam", select: "name shortName" },
          { path: "tournament", select: "name year" },
          { path: "division", select: "name category" },
        ],
      })
      .populate("proposedEvent.team", "name shortName")
      .populate("proposedEvent.player", "firstName lastName jerseyNumber")
      .populate("originalEvent.team", "name shortName")
      .populate("originalEvent.player", "firstName lastName jerseyNumber")
      .sort({ createdAt: 1 })
      .exec();
  }

  async approveCorrection(id: string, admin: User) {
    const correction = await this.getPendingCorrection(id);

    if (correction.operation === "create") {
      if (!correction.proposedEvent) throw new Error("La corrección no tiene evento propuesto");
      await this.gameService.addGameEvent(this.getReferenceId(correction.game), this.toGameEventInput(correction.proposedEvent));
    }

    if (correction.operation === "update") {
      if (!correction.event || !correction.proposedEvent) throw new Error("La corrección no tiene evento propuesto");
      await this.gameService.updateGameEvent(
        this.getReferenceId(correction.game),
        this.getReferenceId(correction.event),
        this.toGameEventInput(correction.proposedEvent),
      );
    }

    if (correction.operation === "delete") {
      if (!correction.event) throw new Error("La corrección no tiene evento asociado");
      await this.gameService.removeGameEvent(this.getReferenceId(correction.game), this.getReferenceId(correction.event));
    }

    await GameEventCorrectionModel.findByIdAndUpdate(id, {
      $set: {
        status: "approved",
        reviewedBy: admin.id,
        reviewedAt: new Date(),
      },
    }).exec();
  }

  async rejectCorrection(id: string, admin: User, note?: string) {
    await connectToDatabase();
    const updated = await GameEventCorrectionModel.findOneAndUpdate(
      { _id: id, status: "pending" },
      {
        $set: {
          status: "rejected",
          reviewedBy: admin.id,
          reviewedAt: new Date(),
          reviewNote: note,
        },
      },
      { new: true },
    ).exec();

    if (!updated) {
      throw new Error("Solicitud de corrección no encontrada");
    }
  }

  private async getPendingCorrection(id: string) {
    await connectToDatabase();
    const correction = await GameEventCorrectionModel.findOne({ _id: id, status: "pending" }).exec();

    if (!correction) {
      throw new Error("Solicitud de corrección no encontrada");
    }

    return correction;
  }

  private toStoredPayload(event: GameEventCorrectionInput): GameEvent {
    return {
      quarter: Number(event.quarter),
      type: event.type,
      team: this.toObjectId(event.team) as unknown as string,
      player: event.player ? (this.toObjectId(event.player) as unknown as string) : undefined,
      points: event.points === undefined || event.points === null ? undefined : Number(event.points),
      details: event.details,
    };
  }

  private toGameEventInput(event: GameEventCorrectionInput): GameEventCorrectionInput {
    return {
      quarter: Number(event.quarter),
      type: event.type,
      team: this.getReferenceId(event.team),
      player: event.player ? this.getReferenceId(event.player) : undefined,
      points: event.points === undefined || event.points === null ? undefined : Number(event.points),
      details: event.details,
    };
  }

  private toObjectId(value: unknown): mongoose.Types.ObjectId | undefined {
    const id = this.getReferenceId(value);
    return mongoose.Types.ObjectId.isValid(id) ? new mongoose.Types.ObjectId(id) : undefined;
  }

  private getReferenceId(reference: unknown): string {
    if (!reference) return "";
    if (typeof reference === "string") return reference;

    if (reference instanceof mongoose.Types.ObjectId) {
      return reference.toString();
    }

    if (typeof reference === "object" && "_id" in reference) {
      const id = (reference as { _id?: unknown })._id;
      return id ? id.toString() : "";
    }

    return reference.toString();
  }
}
