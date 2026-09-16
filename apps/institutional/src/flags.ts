import { vercelAdapter } from "@flags-sdk/vercel";
import { flag } from "flags/next";

const booleanOptions = [
  { label: "Oculta", value: false },
  { label: "Visible", value: true },
];

function pageReleaseFlag(key: string, description: string) {
  const baseFlag = {
    key,
    defaultValue: false,
    description,
    options: booleanOptions,
  };

  if (!process.env.FLAGS) {
    return flag<boolean>({
      ...baseFlag,
      decide: () => false,
    });
  }

  return flag<boolean>({
    ...baseFlag,
    adapter: vercelAdapter(),
  });
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
