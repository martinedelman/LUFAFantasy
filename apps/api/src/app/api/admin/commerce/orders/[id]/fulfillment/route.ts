import type { CommerceFulfillmentStatus } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const body = await request.json() as { status?: CommerceFulfillmentStatus }; return noStoreJson(await serviceContainer.commerceService.updateFulfillment(await requireCommerceActor(request), (await params).id, body.status as CommerceFulfillmentStatus)); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/orders/[id]/fulfillment"); } }
