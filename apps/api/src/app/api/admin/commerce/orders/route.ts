import type { CommerceOrderFiltersDto } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";
export async function GET(request: NextRequest) { try { const q = request.nextUrl.searchParams; const filters: CommerceOrderFiltersDto = { status: q.get("status") as CommerceOrderFiltersDto["status"] || undefined, fulfillmentStatus: q.get("fulfillmentStatus") as CommerceOrderFiltersDto["fulfillmentStatus"] || undefined, sellerId: q.get("sellerId") || undefined, from: q.get("from") || undefined, to: q.get("to") || undefined }; return noStoreJson(await serviceContainer.commerceService.listAdminOrders(await requireCommerceActor(request), filters)); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/orders"); } }
