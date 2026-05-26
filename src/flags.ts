import { vercelAdapter } from "@flags-sdk/vercel";
import { flag } from "flags/next";
import crypto from "node:crypto";

const booleanOptions = [
  { label: "Oculta", value: false },
  { label: "Visible", value: true },
];

function ensureFlagsSecret() {
  if (process.env.FLAGS_SECRET || !process.env.FLAGS) {
    return;
  }

  const seedParts = [
    process.env.VERCEL_PROJECT_ID,
    process.env.VERCEL_ORG_ID,
    process.env.VERCEL_GIT_REPO_SLUG,
    "lufa-fantasy-flags-secret-v1",
  ].filter(Boolean);

  const seed = seedParts.join(":");
  process.env.FLAGS_SECRET = crypto.createHash("sha256").update(seed).digest("base64");
}

ensureFlagsSecret();

function pageReleaseFlag(key: string, description: string) {
  const baseFlag = {
    key,
    defaultValue: false,
    description,
    options: booleanOptions,
  };

  if (!process.env.FLAGS || !process.env.FLAGS_SECRET) {
    return flag<boolean>({
      ...baseFlag,
      decide: () => false,
    });
  }

  try {
    return flag<boolean>({
      ...baseFlag,
      adapter: vercelAdapter(),
    });
  } catch {
    return flag<boolean>({
      ...baseFlag,
      decide: () => false,
    });
  }
}

export const showTournamentsPages = pageReleaseFlag(
  "show-tournaments-pages",
  "Muestra las pantallas de torneos en LUFA Fantasy.",
);

export const showTeamsPages = pageReleaseFlag("show-teams-pages", "Muestra las pantallas de equipos en LUFA Fantasy.");

export const showGamesPages = pageReleaseFlag(
  "show-games-pages",
  "Muestra las pantallas de partidos en LUFA Fantasy.",
);

export const showStandingsPages = pageReleaseFlag(
  "show-standings-pages",
  "Muestra las pantallas de posiciones en LUFA Fantasy.",
);

export const showRankingsPages = pageReleaseFlag(
  "show-rankings-pages",
  "Muestra las pantallas de rankings en LUFA Fantasy.",
);

export const showStatisticsPages = pageReleaseFlag(
  "show-statistics-pages",
  "Muestra las pantallas de estadísticas en LUFA Fantasy.",
);

export const showProfilePages = pageReleaseFlag(
  "show-profile-pages",
  "Muestra las pantallas de perfiles en LUFA Fantasy.",
);
