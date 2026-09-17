import { createHash } from "node:crypto";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { verifyMercadoPagoWebhook } from "@lufa/integrations";
import { commerceErrorResponse } from "@/lib/commerce";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as { action?: string; live_mode?: boolean; data?: { id?: string } };
    const queryDataId = request.nextUrl.searchParams.get("data.id") || request.nextUrl.searchParams.get("id") || "";
    const bodyDataId = String(body.data?.id || "");
    if (!queryDataId || !bodyDataId || queryDataId !== bodyDataId) return NextResponse.json({ success: false, message: "Identificador inconsistente." }, { status: 400 });
    const requestId = request.headers.get("x-request-id");
    if (!verifyMercadoPagoWebhook({ signature: request.headers.get("x-signature"), requestId, dataId: queryDataId, secret: process.env.MERCADOPAGO_WEBHOOK_SECRET || "" })) return NextResponse.json({ success: false, message: "Firma inválida." }, { status: 401 });
    const action = body.action || "order.updated";
    const deliveryKey = createHash("sha256").update(`${requestId}:${action}:${queryDataId}`).digest("hex");
    await serviceContainer.commerceService.processWebhook({ deliveryKey, providerResourceId: queryDataId, action, liveMode: body.live_mode === true });
    return NextResponse.json({ success: true });
  } catch (error) { return commerceErrorResponse(request, error, "/api/webhooks/mercado-pago"); }
}
