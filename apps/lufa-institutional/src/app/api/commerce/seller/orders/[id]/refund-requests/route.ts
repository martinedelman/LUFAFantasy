import { proxyCommerce } from "@/lib/commerce-proxy";
import { NextRequest } from "next/server";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxyCommerce(request, `/api/commerce/seller/orders/${encodeURIComponent((await params).id)}/refund-requests`); }
