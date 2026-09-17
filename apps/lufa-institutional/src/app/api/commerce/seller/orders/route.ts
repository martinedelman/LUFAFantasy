import { proxyCommerce } from "@/lib/commerce-proxy";
import { NextRequest } from "next/server";
export function GET(request: NextRequest) { return proxyCommerce(request, "/api/commerce/seller/orders"); }
