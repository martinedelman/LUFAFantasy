import { proxyCommerce } from "@/lib/commerce-proxy";
import { NextRequest } from "next/server";
export function GET(request: NextRequest) { return proxyCommerce(request, "/api/admin/commerce/sellers"); }
export function POST(request: NextRequest) { return proxyCommerce(request, "/api/admin/commerce/sellers"); }
