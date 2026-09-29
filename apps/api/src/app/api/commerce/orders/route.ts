import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const actor = await requireCommerceActor(request);
    return noStoreJson(await serviceContainer.commerceService.listBuyerOrders(actor.id));
  } catch (error) {
    return commerceErrorResponse(request, error, "/api/commerce/orders");
  }
}
