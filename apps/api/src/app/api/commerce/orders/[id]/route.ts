import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try { const actor = await requireCommerceActor(request); const order = await serviceContainer.commerceService.refreshBuyerOrder((await params).id, actor.id); if (!order) return NextResponse.json({ success: false, message: "Compra no encontrada." }, { status: 404 }); return noStoreJson(order); }
  catch (error) { return commerceErrorResponse(request, error, "/api/commerce/orders/[id]"); }
}
