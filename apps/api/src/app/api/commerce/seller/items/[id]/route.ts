import type { UpdateCommerceItemDto } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { return noStoreJson(await serviceContainer.commerceService.updateItem(await requireCommerceActor(request), (await params).id, await request.json() as UpdateCommerceItemDto)); } catch (error) { return commerceErrorResponse(request, error, "/api/commerce/seller/items/[id]"); } }
