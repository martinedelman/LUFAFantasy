import { NextRequest, NextResponse } from "next/server";
import { FANTASY_ONBOARDING_STEPS, type FantasyOnboardingStatus, type FantasyOnboardingStep } from "@lufa/fantasy-core";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

const validStatuses = new Set<FantasyOnboardingStatus>(["not_started", "in_progress", "completed", "skipped"]);
const validSteps = new Set<string>(FANTASY_ONBOARDING_STEPS);

export async function GET(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para ver tu tutorial" }, { status: 401 });
  try {
    return NextResponse.json({ success: true, data: await serviceContainer.fantasyIdentityService.getOnboarding(user.id) });
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
    const onboarding = await serviceContainer.fantasyIdentityService.updateOnboarding(user.id, { status, currentStep });
    return NextResponse.json({ success: true, data: onboarding });
  } catch (error) { return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/onboarding" }); }
}
