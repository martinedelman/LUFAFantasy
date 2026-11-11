import { NextResponse } from "next/server";
import { credentialJwks } from "@/lib/digitalCredential";

/** Clave pública con la que federaciones y verificadores comprueban la firma de una Real ID sin conexión. */
export async function GET() {
  return NextResponse.json(credentialJwks(), { headers: { "Cache-Control": "public, max-age=3600" } });
}
