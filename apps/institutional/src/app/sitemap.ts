import type { MetadataRoute } from "next";

export const dynamic = "force-dynamic";

const appUrl = (process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
const apiUrl = (process.env.API_URL || "http://localhost:3001").replace(/\/$/, "");

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

interface SitemapResource {
  _id?: string;
  id?: string;
  createdAt?: string;
  updatedAt?: string;
  scheduledDate?: string;
}

async function fetchResources(path: string): Promise<SitemapResource[]> {
  const response = await fetch(`${apiUrl}/api/${path}`, {
    cache: "no-store",
    signal: AbortSignal.timeout(5_000),
  });
  if (!response.ok) throw new Error(`API ${path} respondió ${response.status}`);
  const body = await response.json() as { data?: SitemapResource[] } | SitemapResource[];
  return Array.isArray(body) ? body : body.data || [];
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const entries = getStaticEntries();

  try {
    const [players, teams, tournaments, games] = await Promise.all([
      fetchResources("players?limit=1000"),
      fetchResources("teams?limit=1000"),
      fetchResources("tournaments?limit=1000"),
      fetchResources("games?limit=1000"),
    ]);

    const playerEntries = players
      .filter((player) => Boolean(player._id || player.id))
      .map((player) =>
        createEntry(`/players/${player._id || player.id}`, {
          changeFrequency: "weekly",
          priority: 0.75,
          lastModified: toValidDate(player.updatedAt ? new Date(player.updatedAt) : undefined) || toValidDate(player.createdAt ? new Date(player.createdAt) : undefined),
        }),
      );

    const teamEntries = teams
      .filter((team) => Boolean(team._id || team.id))
      .map((team) =>
        createEntry(`/teams/${team._id || team.id}`, {
          changeFrequency: "weekly",
          priority: 0.75,
          lastModified: toValidDate(team.updatedAt ? new Date(team.updatedAt) : undefined) || toValidDate(team.createdAt ? new Date(team.createdAt) : undefined),
        }),
      );

    const tournamentEntries = tournaments
      .filter((tournament) => Boolean(tournament._id || tournament.id))
      .map((tournament) =>
        createEntry(`/tournaments/${tournament._id || tournament.id}`, {
          changeFrequency: "weekly",
          priority: 0.8,
          lastModified: toValidDate(tournament.updatedAt ? new Date(tournament.updatedAt) : undefined) || toValidDate(tournament.createdAt ? new Date(tournament.createdAt) : undefined),
        }),
      );

    const gameEntries = games
      .filter((game) => Boolean(game._id || game.id))
      .map((game) =>
        createEntry(`/games/${game._id || game.id}`, {
          changeFrequency: "daily",
          priority: 0.8,
          lastModified:
            toValidDate(game.updatedAt ? new Date(game.updatedAt) : undefined) ||
            toValidDate(game.scheduledDate ? new Date(game.scheduledDate) : undefined) ||
            toValidDate(game.createdAt ? new Date(game.createdAt) : undefined),
        }),
      );

    return [...entries, ...playerEntries, ...teamEntries, ...tournamentEntries, ...gameEntries];
  } catch (error) {
    console.error("Error generating dynamic sitemap entries:", error);
    return entries;
  }
}
