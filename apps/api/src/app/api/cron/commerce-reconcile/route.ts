import { serviceContainer } from "@/bootstrap/serviceContainer";
import { commerceErrorResponse, noStoreJson } from "@/lib/commerce";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ success: false, message: "No autorizado" }, { status: 401 });
  try { return noStoreJson(await serviceContainer.commerceService.reconcilePending()); }
  catch (error) { return commerceErrorResponse(request, error, "/api/cron/commerce-reconcile"); }
}
