import type { MetadataRoute } from "next";
import { GameService } from "@/services/backend/GameService";
import { PlayerService } from "@/services/backend/PlayerService";
import { TeamService } from "@/services/backend/TeamService";
import { TournamentService } from "@/services/backend/TournamentService";

const appUrl = (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");

const playerService = new PlayerService();
const teamService = new TeamService();
const tournamentService = new TournamentService();
const gameService = new GameService();

type SitemapEntry = MetadataRoute.Sitemap[number];

const staticRoutes = [
  { route: "", changeFrequency: "daily", priority: 1 },
  { route: "/games", changeFrequency: "daily", priority: 0.9 },
  { route: "/players", changeFrequency: "weekly", priority: 0.85 },
  { route: "/rankings", changeFrequency: "daily", priority: 0.85 },
  { route: "/standings", changeFrequency: "daily", priority: 0.85 },
  { route: "/statistics", changeFrequency: "daily", priority: 0.85 },
  { route: "/teams", changeFrequency: "weekly", priority: 0.85 },
  { route: "/tournaments", changeFrequency: "weekly", priority: 0.85 },
] as const;

const toValidDate = (value?: Date): Date | undefined => {
  if (!(value instanceof Date)) {
    return undefined;
  }

  return Number.isNaN(value.getTime()) ? undefined : value;
};

const createEntry = (
  route: string,
  options: {
    changeFrequency: SitemapEntry["changeFrequency"];
    priority: number;
    lastModified?: Date;
  },
): SitemapEntry => ({
  url: `${appUrl}${route}`,
  lastModified: options.lastModified || new Date(),
  changeFrequency: options.changeFrequency,
  priority: options.priority,
});

const getStaticEntries = (): SitemapEntry[] =>
  staticRoutes.map((item) =>
    createEntry(item.route, {
      changeFrequency: item.changeFrequency,
      priority: item.priority,
    }),
  );

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = getStaticEntries();

  try {
    const [players, teams, tournaments, games] = await Promise.all([
      playerService.listPlayers(),
      teamService.listTeams(),
      tournamentService.listTournaments(),
      gameService.listGames({}),
    ]);

    const playerEntries = players
      .filter((player) => Boolean(player.id))
      .map((player) =>
        createEntry(`/players/${player.id}`, {
          changeFrequency: "weekly",
          priority: 0.75,
          lastModified: toValidDate(player.updatedAt) || toValidDate(player.createdAt),
        }),
      );

    const teamEntries = teams
      .filter((team) => Boolean(team.id))
      .map((team) =>
        createEntry(`/teams/${team.id}`, {
          changeFrequency: "weekly",
          priority: 0.75,
          lastModified: toValidDate(team.updatedAt) || toValidDate(team.createdAt),
        }),
      );

    const tournamentEntries = tournaments
      .filter((tournament) => Boolean(tournament.id))
      .map((tournament) =>
        createEntry(`/tournaments/${tournament.id}`, {
          changeFrequency: "weekly",
          priority: 0.8,
          lastModified: toValidDate(tournament.updatedAt) || toValidDate(tournament.createdAt),
        }),
      );

    const gameEntries = games
      .filter((game) => Boolean(game.id))
      .map((game) =>
        createEntry(`/games/${game.id}`, {
          changeFrequency: "daily",
          priority: 0.8,
          lastModified: toValidDate(game.updatedAt) || toValidDate(game.scheduledDate) || toValidDate(game.createdAt),
        }),
      );

    return [...entries, ...playerEntries, ...teamEntries, ...tournamentEntries, ...gameEntries];
  } catch (error) {
    console.error("Error generating dynamic sitemap entries:", error);
    return entries;
  }
}
