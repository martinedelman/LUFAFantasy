import { NextRequest, NextResponse } from "next/server";
import { apiErrorResponse } from "@/lib/apiError";
import { requireAuthenticatedUser, isAuthFailure } from "@/lib/apiGuards";
import { toUserResponseDto } from "@/app/DTOs";

export async function GET(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser(request);
    if (isAuthFailure(result)) return result;

    return NextResponse.json({
      success: true,
      data: toUserResponseDto(result),
    });
  } catch (error) {
    return apiErrorResponse({
      request,
      error,
      message: "Error interno del servidor",
      status: 500,
      route: "/api/auth/me",
      exposeError: true,
    });
  }
}
