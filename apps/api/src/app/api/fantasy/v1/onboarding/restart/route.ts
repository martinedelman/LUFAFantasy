import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";
import { fantasyApiErrorResponse } from "@/lib/fantasyApiError";

export async function POST(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "Iniciá sesión para reiniciar el tutorial" }, { status: 401 });
  try {
    const onboarding = await serviceContainer.fantasyIdentityService.restartOnboarding(user.id);
    return NextResponse.json({ success: true, data: onboarding });
  } catch (error) { return fantasyApiErrorResponse({ request, error, route: "/api/fantasy/v1/onboarding/restart" }); }
}
