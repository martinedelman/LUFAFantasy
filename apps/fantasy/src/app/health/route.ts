export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({
    status: "ok",
    service: "fantasy-flag-uruguay",
    environment: process.env.APP_ENV || "development",
    timestamp: new Date().toISOString(),
  });
}
