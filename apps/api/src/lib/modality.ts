import { NextResponse } from "next/server";
import { DEFAULT_MODALITY, isModality, MODALITIES, type Modality } from "@lufa/sports/entities/Modality";

/**
 * Reads `?modality=` shared by the flag and tackle sites. Missing means flag,
 * so existing clients keep working unchanged; an unknown value is `null`.
 */
export function parseModality(searchParams: URLSearchParams): Modality | null {
  const value = searchParams.get("modality");
  if (value === null || value === "") return DEFAULT_MODALITY;
  return isModality(value) ? value : null;
}

export function invalidModalityResponse() {
  return NextResponse.json(
    { success: false, message: `modality inválida: usa ${MODALITIES.join(" o ")}` },
    { status: 400 },
  );
}

/** For writes: an explicit body value wins over the site's `?modality=`. */
export function resolveModality(bodyValue: unknown, searchParams: URLSearchParams): Modality | null {
  if (bodyValue === undefined || bodyValue === null) return parseModality(searchParams);
  return isModality(bodyValue) ? bodyValue : null;
}
