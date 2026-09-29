import type { CreateCommerceItemDto } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) { try { return noStoreJson(await serviceContainer.commerceService.listSellerItems(await requireCommerceActor(request))); } catch (error) { return commerceErrorResponse(request, error, "/api/commerce/seller/items"); } }
export async function POST(request: NextRequest) { try { return noStoreJson(await serviceContainer.commerceService.createItem(await requireCommerceActor(request), await request.json() as CreateCommerceItemDto), 201); } catch (error) { return commerceErrorResponse(request, error, "/api/commerce/seller/items"); } }
