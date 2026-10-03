import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { return noStoreJson(await serviceContainer.commerceService.executeRefund(await requireCommerceActor(request), (await params).id)); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/refunds/[id]/execute"); } }
