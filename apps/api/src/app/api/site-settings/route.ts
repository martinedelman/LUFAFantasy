import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { getPublicSiteSettings } from "@/lib/siteSettings";

export async function GET(request: NextRequest) {
  try {
    const settings = await getPublicSiteSettings();

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
