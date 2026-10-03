import { proxyCommerce } from "@/lib/commerce-proxy";
import { NextRequest } from "next/server";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxyCommerce(request, `/api/admin/commerce/orders/${encodeURIComponent((await params).id)}/fulfillment`); }
