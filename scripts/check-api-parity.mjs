import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const expected = new Set(`
DELETE /api/games/:id
DELETE /api/games/:id/events/:eventId
DELETE /api/players/:id
DELETE /api/teams/:id
DELETE /api/tournaments/:id
GET /api/admin/audit-logs
GET /api/admin/flag-interests
GET /api/admin/game-event-corrections
GET /api/admin/settings
GET /api/admin/stats
GET /api/admin/system-health
GET /api/admin/users
GET /api/auth/me
GET /api/cron/import-players
GET /api/cron/weekly-digest
GET /api/dashboard
GET /api/divisions
GET /api/fantasy/v1/auth/me
GET /api/fantasy/v1/bootstrap
GET /api/flag-interest/player-registrations
GET /api/games
GET /api/games/:id
GET /api/health
GET /api/judges
GET /api/players
GET /api/players/:id
GET /api/rankings/players
GET /api/site-settings
GET /api/standings
GET /api/statistics/players
GET /api/statistics/teams
GET /api/teams
GET /api/teams/:id
GET /api/tournaments
GET /api/tournaments/:id
PATCH /api/admin/game-event-corrections/:id
PATCH /api/admin/settings
PATCH /api/admin/users/:id
PATCH /api/fantasy/v1/auth/me
PATCH /api/games/:id/complete
PATCH /api/games/:id/events/:eventId
PATCH /api/games/:id/start
PATCH /api/games/:id/walkover
POST /api/admin/player-import/dry-run
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/password-reset/confirm
POST /api/auth/password-reset/request
POST /api/auth/register
POST /api/auth/verify-registration
POST /api/divisions
POST /api/fantasy/v1/auth/login
POST /api/fantasy/v1/auth/logout
POST /api/fantasy/v1/auth/password-reset/confirm
POST /api/fantasy/v1/auth/password-reset/request
POST /api/fantasy/v1/auth/register
POST /api/flag-interest
POST /api/games
POST /api/games/:id/events
POST /api/judges
POST /api/media/upload
POST /api/players
POST /api/statistics/teams
POST /api/teams
POST /api/teams/:id/players
POST /api/tournaments
PUT /api/games
PUT /api/games/:id
PUT /api/players/:id
PUT /api/teams/:id
PUT /api/tournaments/:id
`.trim().split("\n"));

const apiRoot = path.join(process.cwd(), "apps/api/src/app/api");
const actual = new Set();

async function inspect(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await inspect(absolute);
      continue;
    }
    if (entry.name !== "route.ts") continue;

    const route = `/api/${path.relative(apiRoot, directory)}`
      .replaceAll(path.sep, "/")
      .replace(/\[([^\]]+)\]/g, ":$1");
    const source = await readFile(absolute, "utf8");
    for (const match of source.matchAll(/export async function (GET|POST|PUT|PATCH|DELETE)\b/g)) {
      actual.add(`${match[1]} ${route}`);
    }
  }
}

await inspect(apiRoot);

const missing = [...expected].filter((endpoint) => !actual.has(endpoint));
const unexpected = [...actual].filter((endpoint) => !expected.has(endpoint));

if (missing.length || unexpected.length) {
  console.error("La superficie HTTP dejó de ser compatible con la línea base de testing.");
  if (missing.length) console.error(`Faltan:\n- ${missing.join("\n- ")}`);
  if (unexpected.length) console.error(`No registrados:\n- ${unexpected.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log(`Paridad de rutas verificada: ${actual.size} combinaciones método/path.`);
}
