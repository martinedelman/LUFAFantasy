import type { CreateCommerceRefundRequestDto } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { return noStoreJson(await serviceContainer.commerceService.requestRefund(await requireCommerceActor(request), (await params).id, await request.json() as CreateCommerceRefundRequestDto), 201); } catch (error) { return commerceErrorResponse(request, error, "/api/commerce/seller/orders/[id]/refund-requests"); } }
