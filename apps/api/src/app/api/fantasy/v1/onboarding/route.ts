import { NextRequest, NextResponse } from "next/server";
import { FANTASY_ONBOARDING_STEPS, type FantasyOnboardingStatus, type FantasyOnboardingStep } from "@lufa/fantasy-core";
import { getPrismaClient } from "@lufa/database/prisma";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

const validStatuses = new Set<FantasyOnboardingStatus>(["not_started", "in_progress", "completed", "skipped"]);
const validSteps = new Set<string>(FANTASY_ONBOARDING_STEPS);

function serialize(value: { version: number; status: string; currentStep: string; startedAt: Date | null; completedAt: Date | null }) {
  return { version: value.version, status: value.status, currentStep: value.currentStep, startedAt: value.startedAt?.toISOString() || null, completedAt: value.completedAt?.toISOString() || null };
}

export async function GET(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver tu tutorial" }, { status: 401 });
  try {
    const onboarding = await getPrismaClient().fantasyOnboarding.findUnique({ where: { userId: user.id } });
    // Existing users do not receive an unsolicited tutorial; they can restart it from Perfil.
    if (!onboarding) return NextResponse.json({ success: true, data: { version: 1, status: "completed", currentStep: "welcome", startedAt: null, completedAt: null } });
    return NextResponse.json({ success: true, data: serialize(onboarding) });
  } catch (error) { return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/onboarding" }); }
}

export async function PATCH(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para actualizar tu tutorial" }, { status: 401 });
  try {
    const body = await request.json().catch(() => null) as { status?: unknown; currentStep?: unknown } | null;
    const status = typeof body?.status === "string" ? body.status as FantasyOnboardingStatus : undefined;
    const currentStep = typeof body?.currentStep === "string" ? body.currentStep as FantasyOnboardingStep : undefined;
    if (status && !validStatuses.has(status)) return NextResponse.json({ success: false, message: "Estado de tutorial inválido" }, { status: 400 });
    if (currentStep && !validSteps.has(currentStep)) return NextResponse.json({ success: false, message: "Paso de tutorial inválido" }, { status: 400 });
    if (!status && !currentStep) return NextResponse.json({ success: false, message: "Indicá el avance del tutorial" }, { status: 400 });
    const now = new Date();
    const previous = await getPrismaClient().fantasyOnboarding.findUnique({ where: { userId: user.id } });
    const onboarding = await getPrismaClient().fantasyOnboarding.upsert({
      where: { userId: user.id },
      update: {
        ...(status ? { status } : {}),
        ...(currentStep ? { currentStep } : {}),
        ...(status === "in_progress" ? { startedAt: now, completedAt: null } : {}),
        ...(status === "completed" || status === "skipped" ? { completedAt: now } : {}),
      },
      create: { userId: user.id, status: status || "in_progress", currentStep: currentStep || "welcome", ...(status === "in_progress" ? { startedAt: now } : {}) },
    });
    if (status === "in_progress" && previous?.status !== "in_progress") await getPrismaClient().fantasyAuditLog.create({ data: { actorId: user.id, action: "fantasy.onboarding.started" } });
    if (status === "completed" || status === "skipped") await getPrismaClient().fantasyAuditLog.create({ data: { actorId: user.id, action: `fantasy.onboarding.${status}` } });
    return NextResponse.json({ success: true, data: serialize(onboarding) });
  } catch (error) { return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/onboarding" }); }
}
