import { NextRequest, NextResponse } from "next/server";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { fantasyUserFromRequest } from "@/lib/fantasyAuth";

export async function GET(request: NextRequest) {
  const user = await fantasyUserFromRequest(request);
  if (!user) return NextResponse.json({ success: false, message: "No autenticado" }, { status: 401 });
  const bootstrap = await serviceContainer.fantasyIdentityService.bootstrap(user.id);
  return NextResponse.json({ success: true, data: { user, ...bootstrap } });
}
