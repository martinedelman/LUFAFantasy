import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para guardar favoritos" }, { status: 401 });
  try {
    const { id } = await context.params;
    const db = getPrismaClient();
    const defenseTeamId = id.startsWith("team-defense:") ? id.slice("team-defense:".length) : null;
    if (defenseTeamId) {
      const team = await db.team.findUnique({ where: { id: defenseTeamId }, select: { id: true } });
      if (!team) return NextResponse.json({ success: false, message: "No encontramos esa defensa de equipo" }, { status: 404 });
      await db.fantasyPlayerFavorite.upsert({ where: { userId_defenseTeamId: { userId: user.id, defenseTeamId } }, update: {}, create: { userId: user.id, defenseTeamId } });
    } else {
      const player = await db.player.findUnique({ where: { id }, select: { id: true } });
      if (!player) return NextResponse.json({ success: false, message: "No encontramos ese jugador" }, { status: 404 });
      await db.fantasyPlayerFavorite.upsert({ where: { userId_playerId: { userId: user.id, playerId: id } }, update: {}, create: { userId: user.id, playerId: id } });
    }
    return NextResponse.json({ success: true, data: { favorite: true } });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/players/favorite" });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para guardar favoritos" }, { status: 401 });
  try {
    const { id } = await context.params;
    const defenseTeamId = id.startsWith("team-defense:") ? id.slice("team-defense:".length) : null;
    await getPrismaClient().fantasyPlayerFavorite.deleteMany({ where: defenseTeamId ? { userId: user.id, defenseTeamId } : { userId: user.id, playerId: id } });
    return NextResponse.json({ success: true, data: { favorite: false } });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/players/favorite" });
  }
}
