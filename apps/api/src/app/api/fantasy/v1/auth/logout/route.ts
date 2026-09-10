import { NextResponse } from "next/server";
import { clearFantasySession } from "@/lib/fantasyAuth";

export async function POST() {
  const response = NextResponse.json({ success: true });
  clearFantasySession(response);
  return response;
}
