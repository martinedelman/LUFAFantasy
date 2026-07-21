import fs from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";
import packageJson from "../../../../package.json";
import type { PublicHealthComponentDto, PublicHealthResponseDto } from "@/app/DTOs";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SERVICE_NAME = "lufa_fantasy";
const REQUIRED_CONFIGURATION_KEYS = ["environment", "JWT_SECRET", "NEXT_PUBLIC_APP_URL"];
const EXPECTED_CRONS = [
  { path: "/api/cron/import-players", schedule: "0 6 * * *" },
  { path: "/api/cron/weekly-digest", schedule: "0 8 * * 1" },
];

function noStoreHeaders() {
  return {
    "Cache-Control": "no-store, max-age=0",
  };
}

function getEnvironment() {
  return process.env.environment || "missing";
}

function getConfigurationComponent(): PublicHealthComponentDto {
  const configured = REQUIRED_CONFIGURATION_KEYS.every((key) => Boolean(process.env[key]));

  return {
    id: "configuration",
    status: configured ? "ok" : "degraded",
    detail: configured ? "Required configuration is present" : "Required configuration is incomplete",
  };
}

async function getDatabaseComponent(): Promise<PublicHealthComponentDto> {
  if (!process.env.MONGODB_URI) {
    return {
      id: "database",
      status: "degraded",
      detail: "Database is not available",
    };
  }

  try {
    const { default: connectToDatabase } = await import("@/lib/mongodb");
    const mongoose = await connectToDatabase();
    const db = mongoose.connection.db;

    if (!db) {
      throw new Error("Database connection unavailable");
    }

    await db.admin().ping();

    return {
      id: "database",
      status: "ok",
      detail: "Database is reachable",
    };
  } catch {
    return {
      id: "database",
      status: "degraded",
      detail: "Database is not available",
    };
  }
}

async function readConfiguredCrons(): Promise<Array<{ path: string; schedule: string }>> {
  try {
    const raw = await fs.readFile(path.join(process.cwd(), "vercel.json"), "utf8");
    const parsed = JSON.parse(raw) as { crons?: Array<{ path?: string; schedule?: string }> };

    return (parsed.crons || [])
      .filter((cron) => cron.path && cron.schedule)
      .map((cron) => ({ path: cron.path!, schedule: cron.schedule! }));
  } catch {
    return [];
  }
}

async function getScheduledJobsComponent(): Promise<PublicHealthComponentDto> {
  const configuredCrons = await readConfiguredCrons();
  const configured = EXPECTED_CRONS.every((expected) =>
    configuredCrons.some((cron) => cron.path === expected.path && cron.schedule === expected.schedule),
  );

  return {
    id: "scheduled-jobs",
    status: configured ? "ok" : "degraded",
    detail: configured ? "Scheduled jobs are configured" : "Scheduled jobs need attention",
  };
}

export async function GET() {
  const components: PublicHealthComponentDto[] = [
    {
      id: "app",
      status: "ok",
      detail: "Application is reachable",
    },
    getConfigurationComponent(),
    await getDatabaseComponent(),
    await getScheduledJobsComponent(),
  ];
  const status = components.every((component) => component.status === "ok") ? "ok" : "degraded";
  const body: PublicHealthResponseDto = {
    status,
    service: SERVICE_NAME,
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    environment: getEnvironment(),
    version: packageJson.version,
    components,
  };

  return NextResponse.json(
    {
      success: status === "ok",
      data: body,
    },
    {
      status: status === "ok" ? 200 : 503,
      headers: noStoreHeaders(),
    },
  );
}
