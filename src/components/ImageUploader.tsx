"use client";

import { ChangeEvent, useMemo, useState } from "react";
import Avatar from "@/components/Avatar";

type UploadAssetType = "team_logo" | "team_background" | "player_profile_picture";

interface ImageUploaderProps {
  label: string;
  assetType: UploadAssetType;
  value?: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
}

interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
  };
  message?: string;
}

export default function ImageUploader({ label, assetType, value, onUploaded, disabled = false }: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inputId = useMemo(() => `${assetType}-upload-input`, [assetType]);

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", assetType);
      if (value) {
        formData.append("currentUrl", value);
      }

      const response = await fetch("/api/media/upload", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as UploadResponse;
      if (!response.ok || !payload.success || !payload.data?.url) {
        throw new Error(payload.message || "No se pudo subir la imagen");
      }

      onUploaded(payload.data.url);
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Error al subir imagen";
      setError(message);
    } finally {
      setIsUploading(false);
      event.target.value = "";
    }
  };

  return (
    <div>
      <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 mb-2">
        {label}
      </label>

      <div className="mb-2">
        <Avatar
          imageUrl={value}
          alt={label}
          fallback="IMG"
          size="xl"
          shape="rounded"
          backgroundColor="transparent"
          className={!value ? "border border-dashed border-gray-300" : undefined}
          fallbackClassName="text-xs font-medium text-gray-500"
        />
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        disabled={disabled || isUploading}
        className="block w-full text-sm text-gray-700 file:mr-4 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-green-600 file:text-white hover:file:bg-green-700 disabled:opacity-50"
      />

      <p className="mt-1 text-xs text-gray-500">Formatos soportados: JPG, PNG, WEBP, GIF, SVG. Máximo 5MB.</p>

      {isUploading && <p className="mt-2 text-sm text-blue-600">Subiendo imagen...</p>}
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
    </div>
  );
}
