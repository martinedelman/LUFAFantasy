import { NextRequest, NextResponse } from "next/server";
import { AuthService, BlobStorageService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import type { BlobAssetType } from "@/services/backend/BlobStorageService";

const authService = new AuthService();
const blobStorageService = new BlobStorageService();

const VALID_ASSET_TYPES: BlobAssetType[] = ["team_logo", "team_background", "player_profile_picture"];

/**
 * POST /api/media/upload
 * Sube imágenes de logos y profile pictures al proveedor de storage configurado.
 */
export async function POST(request: NextRequest) {
  try {
    const token = getSessionTokenFromRequest(request);

    if (!token) {
      return NextResponse.json(
        {
          success: false,
          message: "No autenticado",
        },
        { status: 401 },
      );
    }

    const isAdmin = await authService.verifyAdmin(token);
    if (!isAdmin) {
      return NextResponse.json(
        {
          success: false,
          message: "No autorizado. Solo administradores pueden subir imágenes",
        },
        { status: 403 },
      );
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const assetType = formData.get("assetType");
    const currentUrl = formData.get("currentUrl");

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

    const uploadedFile =
      typeof currentUrl === "string" && currentUrl.trim().length > 0
        ? await blobStorageService.update(currentUrl, {
            file,
            assetType: assetType as BlobAssetType,
          })
        : await blobStorageService.create({
            file,
            assetType: assetType as BlobAssetType,
          });

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
    const message = error instanceof Error ? error.message : "Error al subir archivo";
    const status = message.includes("imagen") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
