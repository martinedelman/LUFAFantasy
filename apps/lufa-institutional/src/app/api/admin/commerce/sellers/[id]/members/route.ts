import { proxyCommerce } from "@/lib/commerce-proxy";
import { NextRequest } from "next/server";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { return proxyCommerce(request, `/api/admin/commerce/sellers/${encodeURIComponent((await params).id)}/members`); }
