import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para guardar favoritos" }, { status: 401 });
  try {
    const { id: playerId } = await context.params;
    const db = getPrismaClient();
    const player = await db.player.findUnique({ where: { id: playerId }, select: { id: true } });
    if (!player) return NextResponse.json({ success: false, message: "No encontramos ese jugador" }, { status: 404 });
    await db.fantasyPlayerFavorite.upsert({ where: { userId_playerId: { userId: user.id, playerId } }, update: {}, create: { userId: user.id, playerId } });
    return NextResponse.json({ success: true, data: { favorite: true } });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/players/favorite" });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para guardar favoritos" }, { status: 401 });
  try {
    const { id: playerId } = await context.params;
    await getPrismaClient().fantasyPlayerFavorite.deleteMany({ where: { userId: user.id, playerId } });
    return NextResponse.json({ success: true, data: { favorite: false } });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/players/favorite" });
  }
}
