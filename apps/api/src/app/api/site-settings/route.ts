import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { invalidModalityResponse, parseModality } from "@/lib/modality";
import { getPublicSiteSettings } from "@/lib/siteSettings";

export async function GET(request: NextRequest) {
  try {
    const modality = parseModality(request.nextUrl.searchParams);
    if (!modality) return invalidModalityResponse();

    const settings = await getPublicSiteSettings(modality);

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error al obtener configuración pública",
      status: 500,
      route: "/api/site-settings",
    });
  }
}
