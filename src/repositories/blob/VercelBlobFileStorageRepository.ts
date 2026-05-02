import { del, head, put } from "@vercel/blob";
import { FileUploadInput, IFileStorageRepository, StoredFileMetadata } from "../contracts";

export class VercelBlobFileStorageRepository implements IFileStorageRepository {
  private readonly token?: string;

  constructor(token?: string) {
    this.token = token || process.env.BLOB_READ_WRITE_TOKEN;
  }

  private getToken(): string {
    if (!this.token) {
      throw new Error("Falta configurar BLOB_READ_WRITE_TOKEN en variables de entorno");
    }

    return this.token;
  }

  async create(input: FileUploadInput): Promise<StoredFileMetadata> {
    const uploadedBlob = await put(input.pathname, input.file, {
      access: "public",
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: input.contentType,
      token: this.getToken(),
    });

    return {
      pathname: uploadedBlob.pathname,
      url: uploadedBlob.url,
      contentType: uploadedBlob.contentType,
    };
  }

  async read(url: string): Promise<StoredFileMetadata | null> {
    try {
      const blobInfo = await head(url, { token: this.getToken() });
      return {
        pathname: blobInfo.pathname,
        url: blobInfo.url,
        size: blobInfo.size,
        contentType: blobInfo.contentType,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message.toLowerCase() : "";
      if (message.includes("not found") || message.includes("404")) {
        return null;
      }

      throw error;
    }
  }

  async update(currentUrl: string, input: FileUploadInput): Promise<StoredFileMetadata> {
    try {
      await this.delete(currentUrl);
    } catch {
      // Si la URL previa no existe o no pertenece al provider actual, se continúa con la nueva carga.
    }

    return this.create(input);
  }

  async delete(url: string): Promise<void> {
    await del(url, { token: this.getToken() });
  }
}
