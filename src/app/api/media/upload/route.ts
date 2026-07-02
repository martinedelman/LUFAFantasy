import { NextRequest, NextResponse } from "next/server";
import { BlobStorageService, PlayerService } from "@/services/backend";
import { apiErrorResponse, extractErrorMessage, resolveErrorStatus } from "@/lib/apiError";
import { requireAuthenticatedUser, isAuthFailure } from "@/lib/apiGuards";
import { normalizeEmail } from "@/lib/normalize";
import { safeTrack } from "@/lib/serverAnalytics";
import type { BlobAssetType } from "@/services/backend/BlobStorageService";

const blobStorageService = new BlobStorageService();
const playerService = new PlayerService();

const VALID_ASSET_TYPES: BlobAssetType[] = ["team_logo", "team_background", "player_profile_picture"];

/**
 * POST /api/media/upload
 * Sube imágenes de logos y profile pictures al proveedor de storage configurado.
 */
export async function POST(request: NextRequest) {
  try {
    const result = await requireAuthenticatedUser(request);
    if (isAuthFailure(result)) return result;
    const user = result;

    const formData = await request.formData();
    const file = formData.get("file");
    const assetType = formData.get("assetType");
    const currentUrl = formData.get("currentUrl");
    const ownerType = formData.get("ownerType");
    const ownerId = formData.get("ownerId");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          success: false,
          message: "Debe adjuntar un archivo válido",
        },
        { status: 400 },
      );
    }

    if (typeof assetType !== "string" || !VALID_ASSET_TYPES.includes(assetType as BlobAssetType)) {
      return NextResponse.json(
        {
          success: false,
          message: "assetType inválido. Use team_logo, team_background o player_profile_picture",
        },
        { status: 400 },
      );
    }

    if (user.role !== "admin") {
      if (assetType === "team_logo" || assetType === "team_background") {
        return NextResponse.json(
          {
            success: false,
            message: "No autorizado. Solo administradores pueden modificar fotos de equipos",
          },
          { status: 403 },
        );
      }

      const userEmail = normalizeEmail(user.email);
      let canUpload = false;
      let allowedCurrentUrl = "";

      if (
        assetType === "player_profile_picture" &&
        ownerType === "player" &&
        typeof ownerId === "string" &&
        ownerId.trim()
      ) {
        const player = await playerService.getPlayerById(ownerId);
        canUpload = userEmail === normalizeEmail(player?.email);
        allowedCurrentUrl = player?.profilePicture || "";
      }

      if (typeof currentUrl === "string" && currentUrl.trim() && currentUrl !== allowedCurrentUrl) {
        canUpload = false;
      }

      if (!canUpload) {
        return NextResponse.json(
          {
            success: false,
            message: "No autorizado para subir imágenes de este perfil",
          },
          { status: 403 },
        );
      }
    }

    const currentUrlValue = typeof currentUrl === "string" ? currentUrl.trim() : "";
    const operation = currentUrlValue.length > 0 ? "updated" : "created";
    const uploadedFile =
      operation === "updated"
        ? await blobStorageService.update(currentUrlValue, {
            file,
            assetType: assetType as BlobAssetType,
          })
        : await blobStorageService.create({
            file,
            assetType: assetType as BlobAssetType,
          });

    if (user.role !== "admin") {
      await safeTrack("Media uploaded", {
        assetType,
        operation,
        ownerType: typeof ownerType === "string" ? ownerType : null,
        userRole: user.role,
        contentType: uploadedFile.contentType || null,
        size: uploadedFile.size ?? null,
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          url: uploadedFile.url,
          pathname: uploadedFile.pathname,
          contentType: uploadedFile.contentType,
          size: uploadedFile.size,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    const message = extractErrorMessage(error, "Error al subir archivo");
    const status = resolveErrorStatus(message, [
      { match: "Token", status: 401 },
      { match: "Usuario", status: 401 },
      { match: "imagen", status: 400 },
    ], 500);

    return apiErrorResponse({ request, error, message, status, route: "/api/media/upload" });
  }
}
