import { NextRequest, NextResponse } from "next/server";
import { getPrismaClient } from "@lufa/database/prisma";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function POST(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para reiniciar el tutorial" }, { status: 401 });
  try {
    const now = new Date();
    const onboarding = await getPrismaClient().fantasyOnboarding.upsert({
      where: { userId: user.id },
      update: { version: 1, status: "not_started", currentStep: "welcome", startedAt: null, completedAt: null },
      create: { userId: user.id },
    });
    await getPrismaClient().fantasyAuditLog.create({ data: { actorId: user.id, action: "fantasy.onboarding.restarted", metadata: { at: now.toISOString() } } });
    return NextResponse.json({ success: true, data: { version: onboarding.version, status: onboarding.status, currentStep: onboarding.currentStep, startedAt: null, completedAt: null } });
  } catch (error) { return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/onboarding/restart" }); }
}
