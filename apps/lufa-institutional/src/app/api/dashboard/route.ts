import { NextResponse } from "next/server";
import { getInstitutionalApiUrl } from "@/lib/institutional-auth";

export async function GET() {
  const apiUrl = getInstitutionalApiUrl();

  try {
    const response = await fetch(`${apiUrl}/api/dashboard`, {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const body = await response.text();

    return new NextResponse(body, {
      status: response.status,
      headers: {
        "Cache-Control": "no-store",
        "Content-Type": response.headers.get("content-type") || "application/json",
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Los próximos partidos no están disponibles ahora." },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
