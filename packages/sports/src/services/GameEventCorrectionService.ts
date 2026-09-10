/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Game, GameEvent, GameEventType } from "@lufa/sports/entities/Game";
import type { User } from "@lufa/sports/entities/User";
import { GameService } from "./GameService";

export interface GameEventCorrectionInput {
  quarter: number;
  type: GameEventType;
  team: string;
  player?: string;
  points?: number;
  details?: unknown;
}

type GameEventCorrectionOperation = "create" | "update" | "delete";

export interface GameEventCorrectionRepositoryPort {
  findGameEventSnapshot(gameId: string, eventId: string): Promise<Record<string, unknown> | null>;
  createGameEventCorrection(data: Record<string, unknown>): Promise<Record<string, unknown>>;
  listPendingGameEventCorrections(): Promise<Record<string, unknown>[]>;
  findPendingGameEventCorrection(id: string): Promise<Record<string, unknown> | null>;
  reviewGameEventCorrection(
    id: string,
    status: "approved" | "rejected",
    reviewedById: string,
    reviewedAt: Date,
    reviewNote?: string,
  ): Promise<boolean>;
}

export class GameEventCorrectionService {
  constructor(
    private readonly gameService: GameService,
    private readonly auxiliaryRepo: GameEventCorrectionRepositoryPort,
  ) {}

  async createPendingCorrection(data: {
    game: Game;
    eventId?: string;
    operation: GameEventCorrectionOperation;
    proposedEvent?: GameEventCorrectionInput;
    requestedBy: User;
  }) {
    if (data.game.status !== "completed") {
      throw new Error("Solo los partidos finalizados requieren aprobación de correcciones");
    }

    if (data.operation !== "create" && !data.eventId) {
      throw new Error("El evento a corregir es requerido");
    }

    const originalEvent =
      data.eventId && data.operation !== "create"
        ? await this.auxiliaryRepo.findGameEventSnapshot(data.game.id!, data.eventId)
        : null;

    if (data.operation !== "create" && !originalEvent) {
      throw new Error("Evento no encontrado");
    }

    const proposedEvent = data.proposedEvent
      ? this.gameService.buildValidatedGameEvent(data.game, data.proposedEvent)
      : undefined;

    const correction = await this.auxiliaryRepo.createGameEventCorrection({
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

  async listPendingCorrections(): Promise<any[]> {
    return (await this.auxiliaryRepo.listPendingGameEventCorrections()) as any[];
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

    await this.auxiliaryRepo.reviewGameEventCorrection(id, "approved", admin.id!, new Date());
  }

  async rejectCorrection(id: string, admin: User, note?: string) {
    const updated = await this.auxiliaryRepo.reviewGameEventCorrection(id, "rejected", admin.id!, new Date(), note);

    if (!updated) {
      throw new Error("Solicitud de corrección no encontrada");
    }
  }

  private async getPendingCorrection(id: string) {
    const correction = await this.auxiliaryRepo.findPendingGameEventCorrection(id);

    if (!correction) {
      throw new Error("Solicitud de corrección no encontrada");
    }

    return correction as any;
  }

  private toStoredPayload(event: GameEventCorrectionInput): GameEvent {
    return {
      quarter: Number(event.quarter),
      type: event.type,
      team: this.getReferenceId(event.team),
      player: event.player ? this.getReferenceId(event.player) : undefined,
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

  private getReferenceId(reference: unknown): string {
    if (!reference) return "";
    if (typeof reference === "string") return reference;

    if (typeof reference === "object" && reference && ("id" in reference || "_id" in reference)) {
      const value = reference as { id?: unknown; _id?: unknown };
      const id = value.id ?? value._id;
      return id ? id.toString() : "";
    }

    return reference.toString();
  }
}
