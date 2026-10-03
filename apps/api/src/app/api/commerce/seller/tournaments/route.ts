import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try {
    return noStoreJson(await serviceContainer.commerceService.listTournamentOptions(await requireCommerceActor(request)));
  } catch (error) {
    return commerceErrorResponse(request, error, "/api/commerce/seller/tournaments");
  }
}
