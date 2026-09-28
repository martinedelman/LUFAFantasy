import type { CreateCommerceCheckoutQuoteDto } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { checkRateLimit, rateLimitResponse } from "@/lib/rateLimit";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const rate = checkRateLimit(request, { key: "commerce-checkout-quote", limit: 30, windowMs: 60_000 });
  if (!rate.allowed) return rateLimitResponse(rate.resetAt);
  try { return noStoreJson(await serviceContainer.commerceService.quoteCheckout(await requireCommerceActor(request), await request.json() as CreateCommerceCheckoutQuoteDto)); }
  catch (error) { return commerceErrorResponse(request, error, "/api/commerce/checkouts/quote"); }
}
