import { proxyCommerce } from "@/lib/commerce-proxy";
import { NextRequest } from "next/server";
export function POST(request: NextRequest) { return proxyCommerce(request, "/api/commerce/checkouts"); }
