import { proxyCommerce } from "@/lib/commerce-proxy";
import { NextRequest } from "next/server";
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxyCommerce(request, `/api/commerce/orders/${encodeURIComponent((await params).id)}`); }
