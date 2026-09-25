import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson, requireCommerceActor } from "@/lib/commerce";
import { NextRequest } from "next/server";
export async function GET(request: NextRequest) { try { return noStoreJson(await serviceContainer.commerceService.listAdminDashboard(await requireCommerceActor(request))); } catch (error) { return commerceErrorResponse(request, error, "/api/admin/commerce/dashboard"); } }
