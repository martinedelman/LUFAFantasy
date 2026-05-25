import { NextRequest, NextResponse } from "next/server";
import { AuthService, BlobStorageService, PlayerService, TeamService } from "@/services/backend";
import { getSessionTokenFromRequest } from "@/lib/auth";
import type { BlobAssetType } from "@/services/backend/BlobStorageService";

const authService = new AuthService();
const blobStorageService = new BlobStorageService();
const playerService = new PlayerService();
const teamService = new TeamService();

const VALID_ASSET_TYPES: BlobAssetType[] = ["team_logo", "team_background", "player_profile_picture"];

function normalizeEmail(email?: string | null) {
  return email?.trim().toLowerCase() || "";
}

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

    const user = await authService.verifyToken(token);

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

      if (
        (assetType === "team_logo" || assetType === "team_background") &&
        ownerType === "team" &&
        typeof ownerId === "string" &&
        ownerId.trim()
      ) {
        const team = await teamService.getTeamById(ownerId);
        canUpload =
          userEmail === normalizeEmail(team?.contact?.email) || userEmail === normalizeEmail(team?.coach?.email);
        allowedCurrentUrl = assetType === "team_logo" ? team?.logo || "" : team?.backgroundImage || "";
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
    const status =
      message.includes("Token") || message.includes("Usuario") ? 401 : message.includes("imagen") ? 400 : 500;

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status },
    );
  }
}
