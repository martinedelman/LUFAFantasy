import type { CreateCommerceSellerDto } from "@lufa/contracts";
import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";
export async function GET(request: NextRequest) { try { return noStoreJson(await serviceContainer.commerceService.listCommerceSellers(await requireCommerceActor(request))); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/sellers"); } }
export async function POST(request: NextRequest) { try { return noStoreJson(await serviceContainer.commerceService.createSeller(await requireCommerceActor(request), await request.json() as CreateCommerceSellerDto), 201); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/sellers"); } }
