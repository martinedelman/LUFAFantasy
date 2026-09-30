import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const body = await request.json() as { status?: "active" | "inactive" }; return noStoreJson(await serviceContainer.commerceService.updateSellerStatus(await requireCommerceActor(request), (await params).id, body.status as "active" | "inactive")); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/sellers/[id]"); } }
