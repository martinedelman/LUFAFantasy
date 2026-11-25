import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse } from "@/lib/commerce";
import { NextRequest, NextResponse } from "next/server";

/**
 * Callback del Botón de Pago Handy. Handy no firma sus notificaciones: la URL lleva un token
 * HMAC por orden que sólo LUFA puede generar, y el cuerpo se cruza contra la compra local.
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ orderId: string }> }) {
  try {
    const body = await request.json().catch(() => null);
    await serviceContainer.commerceService.processProviderNotification({
      orderId: (await params).orderId,
      token: request.nextUrl.searchParams.get("token"),
      body,
    });
    return NextResponse.json({ success: true });
  } catch (error) { return commerceErrorResponse(withoutToken(request), error, "/api/webhooks/handy/[orderId]"); }
}

/** El token autoriza el callback: no debe quedar en los logs de error. */
function withoutToken(request: NextRequest) {
  const url = new URL(request.url);
  if (url.searchParams.has("token")) url.searchParams.set("token", "redacted");
  return new NextRequest(url, { method: request.method, headers: request.headers });
}
