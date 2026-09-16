export interface StoredFileMetadata {
  pathname: string;
  url: string;
  size?: number;
  contentType?: string;
}

export interface FileUploadInput {
  pathname: string;
  file: Blob;
  contentType?: string;
}

/**
 * Contrato CRUD para almacenamiento de archivos.
 * Permite intercambiar proveedor (Vercel Blob, S3, etc.) sin cambiar servicios de negocio.
 */
export interface IFileStorageRepository {
  create(input: FileUploadInput): Promise<StoredFileMetadata>;
  read(url: string): Promise<StoredFileMetadata | null>;
  update(currentUrl: string, input: FileUploadInput): Promise<StoredFileMetadata>;
  delete(url: string): Promise<void>;
}
