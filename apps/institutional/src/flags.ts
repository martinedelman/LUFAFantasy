import { vercelAdapter } from "@flags-sdk/vercel";
import { flag } from "flags/next";

const booleanOptions = [
  { label: "Oculta", value: false },
  { label: "Visible", value: true },
];

const authenticationOptions = [
  { label: "Login central de LUFA", value: false },
  { label: "Login legacy de Flag", value: true },
];

function pageReleaseFlag(key: string, description: string) {
  return flag<boolean>({
    key,
    // These sections are already public. If the provider is unavailable or a
    // flag has not been promoted yet, keep the existing site accessible.
    defaultValue: true,
    description,
    options: booleanOptions,
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

const legacyFlagAuthenticationDefinition = {
  key: "use-legacy-flag-auth",
  defaultValue: true,
  description:
    "Mantiene login, registro, verificación y recuperación dentro de flag.lufa.com.uy. Apagar cuando lufa.com.uy esté habilitado en producción.",
  options: authenticationOptions,
};

export const legacyFlagAuthentication = flag<boolean>({
  ...legacyFlagAuthenticationDefinition,
  adapter: vercelAdapter(),
});
