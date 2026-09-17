import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { try { const body = await request.json() as { userId?: string }; await serviceContainer.commerceService.addSellerMember(await requireCommerceActor(request), (await params).id, body.userId || ""); return noStoreJson({ added: true }, 201); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/sellers/[id]/members"); } }
