import RepositoryContainer from "@/repositories";
import { StoredFileMetadata } from "@/repositories/contracts";

export type BlobAssetType = "team_logo" | "team_background" | "player_profile_picture";

interface UploadAssetInput {
  file: File;
  assetType: BlobAssetType;
}

/**
 * Servicio de almacenamiento de archivos para assets de la app.
 * Encapsula la estructura de folders por entorno y tipo de asset.
 */
export class BlobStorageService {
  private readonly fileStorageRepo = RepositoryContainer.getFileStorageRepository();
  private readonly maxImageSizeBytes = 5 * 1024 * 1024;

  private getEnvironmentFolder(): "prod_env" | "dev_env" {
    return process.env.environment === "production" ? "prod_env" : "dev_env";
  }

  private getAssetFolder(assetType: BlobAssetType): "team_logos" | "team_backgrounds" | "profile_pictures" {
    if (assetType === "team_logo") {
      return "team_logos";
    }

    if (assetType === "team_background") {
      return "team_backgrounds";
    }

    return "profile_pictures";
  }

  private sanitizeFileName(name: string): string {
    return name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9.-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  private getFileExtension(fileName: string, contentType: string): string {
    const byName = fileName.split(".").pop()?.toLowerCase();
    if (byName && byName.length <= 5) {
      return byName;
    }

    const mimeToExt: Record<string, string> = {
      "image/jpeg": "jpg",
      "image/png": "png",
      "image/webp": "webp",
      "image/gif": "gif",
      "image/svg+xml": "svg",
    };

    return mimeToExt[contentType] || "jpg";
  }

  private validateImage(file: File): void {
    if (!file.type.startsWith("image/")) {
      throw new Error("El archivo debe ser una imagen");
    }

    if (file.size > this.maxImageSizeBytes) {
      throw new Error("La imagen no puede superar 5MB");
    }
  }

  private buildPath(file: File, assetType: BlobAssetType): string {
    const envFolder = this.getEnvironmentFolder();
    const assetFolder = this.getAssetFolder(assetType);
    const extension = this.getFileExtension(file.name || "file", file.type);
    const fileNameWithoutExt = file.name?.replace(/\.[^.]+$/, "") || "image";
    const safeFileName = this.sanitizeFileName(fileNameWithoutExt) || "image";
    const uniqueSuffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    return `${envFolder}/${assetFolder}/${safeFileName}-${uniqueSuffix}.${extension}`;
  }

  async create(input: UploadAssetInput): Promise<StoredFileMetadata> {
    this.validateImage(input.file);

    const pathname = this.buildPath(input.file, input.assetType);
    return this.fileStorageRepo.create({
      pathname,
      file: input.file,
      contentType: input.file.type,
    });
  }

  async read(url: string): Promise<StoredFileMetadata | null> {
    return this.fileStorageRepo.read(url);
  }

  async update(currentUrl: string, input: UploadAssetInput): Promise<StoredFileMetadata> {
    this.validateImage(input.file);

    const pathname = this.buildPath(input.file, input.assetType);
    return this.fileStorageRepo.update(currentUrl, {
      pathname,
      file: input.file,
      contentType: input.file.type,
    });
  }

  async delete(url: string): Promise<void> {
    await this.fileStorageRepo.delete(url);
  }
}
