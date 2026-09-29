import type { CreateCommerceCheckoutDto } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, { key: "commerce-checkout", limit: 12, windowMs: 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);
  try { return noStoreJson(await serviceContainer.commerceService.createCheckout(await requireCommerceActor(request), await request.json() as CreateCommerceCheckoutDto), 201); }
  catch (error) { return commerceErrorResponse(request, error, "/api/commerce/checkouts"); }
}
