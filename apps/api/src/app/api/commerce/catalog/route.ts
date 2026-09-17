import { serviceContainer } from "@/bootstrap/serviceContainer";
import { currentUserFromRequest } from "@/lib/currentUser";
import { commerceErrorResponse, noStoreJson } from "@/lib/commerce";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  try { const user = await currentUserFromRequest(request).catch(() => null); return noStoreJson(await serviceContainer.commerceService.listCatalog(user?.id)); }
  catch (error) { return commerceErrorResponse(request, error, "/api/commerce/catalog"); }
}
