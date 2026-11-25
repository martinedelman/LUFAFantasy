import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para guardar favoritos" }, { status: 401 });
  try {
    const { id } = await context.params;
    if (!await serviceContainer.fantasyPlayerService.addFavorite(user.id, id)) {
      const message = id.startsWith("team-defense:") ? "No encontramos esa defensa de equipo" : "No encontramos ese jugador";
      return NextResponse.json({ success: false, message }, { status: 404 });
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
    await serviceContainer.fantasyPlayerService.removeFavorite(user.id, id);
    return NextResponse.json({ success: true, data: { favorite: false } });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/players/favorite" });
  }
}
