import type { PlayerPosition } from "@/entities/Player";

export function normalizeOptionalText(value: string | null | undefined): string | undefined {
  if (value === null || value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function normalizeEmail(email?: string | null): string {
  return email?.trim().toLowerCase() || "";
}

export function normalizeSecondaryPosition(value: unknown): PlayerPosition | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === "string" && value.trim().length === 0) {
    return undefined;
  }

  return value as PlayerPosition;
}

export function parseRequiredDate(value: unknown, fieldLabel: string): Date {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldLabel} es requerida`);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldLabel} inválida`);
  }

  return parsedDate;
}

export function parseOptionalDate(value: unknown, fieldLabel: string): Date | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${fieldLabel} no puede ser nula`);
  }

  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    throw new Error(`${fieldLabel} inválida`);
  }

  return parsedDate;
}
