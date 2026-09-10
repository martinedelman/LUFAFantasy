import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

function numberAt(value: unknown, key: string) {
  if (!value || typeof value !== "object") return 0;
  const candidate = (value as Record<string, unknown>)[key];
  return typeof candidate === "number" && Number.isFinite(candidate) ? candidate : 0;
}

function fantasyPoints(stat: { passing: unknown; rushing: unknown; receiving: unknown; defensive: unknown }) {
  const passing = stat.passing;
  const rushing = stat.rushing;
  const receiving = stat.receiving;
  const defensive = stat.defensive;
  return (
    numberAt(passing, "yards") * 0.04 + numberAt(passing, "touchdowns") * 4 - numberAt(passing, "interceptions") * 2 +
    numberAt(rushing, "yards") * 0.1 + numberAt(rushing, "touchdowns") * 6 - numberAt(rushing, "fumbles") * 2 +
    numberAt(receiving, "receptions") + numberAt(receiving, "yards") * 0.1 + numberAt(receiving, "touchdowns") * 6 - numberAt(receiving, "fumbles") * 2 +
    numberAt(defensive, "tackles") + numberAt(defensive, "sacks") * 2 + numberAt(defensive, "interceptions") * 3 + numberAt(defensive, "fumbleRecoveries") * 2 + numberAt(defensive, "safeties") * 2
  );
}

export async function GET(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver jugadores" }, { status: 401 });
  try {
    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get("leagueId") || "";
    const search = searchParams.get("search")?.trim() || "";
    const position = searchParams.get("position") || "";
    const teamId = searchParams.get("teamId") || "";
    const status = searchParams.get("status") || "";
    const db = getPrismaClient();

    if (leagueId) {
      const membership = await db.fantasyLeagueMember.findFirst({ where: { leagueId, userId: user.id, status: "active" }, select: { id: true } });
      if (!membership) return NextResponse.json({ success: false, message: "No tenés acceso a esta liga" }, { status: 403 });
    }

    // A Fantasy season represents the full calendar year. The masculine and
    // feminine championships are separate tournaments in the institutional data,
    // so both must contribute to the same player ranking.
    const latestTournament = await db.tournament.findFirst({
      where: {
        OR: [
          { playerStats: { some: {} } },
          { games: { some: { events: { some: { playerId: { not: null } } } } } },
        ],
      },
      orderBy: [{ year: "desc" }, { endDate: "desc" }],
    });
    const seasonTournaments = latestTournament
      ? await db.tournament.findMany({
        where: { year: latestTournament.year },
        select: { id: true },
      })
      : [];
    const tournamentIds = seasonTournaments.map((tournament) => tournament.id);
    const players = await db.player.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        ...(status ? { status } : {}),
        ...(position ? { OR: [{ position }, { secondaryPosition: position }] } : {}),
        ...(search ? { OR: [{ firstName: { contains: search, mode: "insensitive" } }, { lastName: { contains: search, mode: "insensitive" } }] } : {}),
      },
      include: {
        team: { select: { id: true, name: true, shortName: true } },
        playerStats: tournamentIds.length ? { where: { tournamentId: { in: tournamentIds } }, select: { passing: true, rushing: true, receiving: true, defensive: true, gamesPlayed: true } } : false,
        events: tournamentIds.length ? { where: { game: { tournamentId: { in: tournamentIds } } }, select: { points: true, gameId: true } } : false,
        fantasyFavorites: { where: { userId: user.id }, select: { id: true } },
      },
    });
    const data = players.map((player) => {
      const statistics = player.playerStats || [];
      const eventPoints = (player.events || []).reduce((total, event) => total + (event.points || 0), 0);
      const points = statistics.length > 0
        ? statistics.reduce((total, statistic) => total + fantasyPoints(statistic), 0)
        : eventPoints;
      const gamesPlayed = statistics.length > 0
        ? statistics.reduce((total, statistic) => total + statistic.gamesPlayed, 0)
        : new Set((player.events || []).map((event) => event.gameId)).size;
      return {
        id: player.id,
        name: `${player.firstName} ${player.lastName}`.trim(),
        position: player.position,
        secondaryPosition: player.secondaryPosition,
        status: player.status,
        profilePicture: player.profilePicture,
        teamId: player.team.id,
        teamName: player.team.name,
        lastSeasonPoints: Math.round(points * 100) / 100,
        gamesPlayed,
        favorite: player.fantasyFavorites.length > 0,
      };
    }).sort((left, right) => right.lastSeasonPoints - left.lastSeasonPoints || left.name.localeCompare(right.name, "es"));
    return NextResponse.json({ success: true, data: { season: latestTournament ? `Temporada ${latestTournament.year}` : "Sin temporada registrada", players: data } });
  } catch (error) {
    return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/players" });
  }
}
