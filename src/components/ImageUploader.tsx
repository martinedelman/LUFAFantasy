"use client";

import { ChangeEvent, KeyboardEvent, PointerEvent, useEffect, useMemo, useRef, useState } from "react";
import Avatar from "@/components/Avatar";

type UploadAssetType = "team_logo" | "team_background" | "player_profile_picture";

interface ImageUploaderProps {
  label: string;
  assetType: UploadAssetType;
  value?: string;
  onUploaded: (url: string) => void;
  disabled?: boolean;
  enableCrop?: boolean;
  ownerType?: "player" | "team";
  ownerId?: string;
}

interface UploadResponse {
  success: boolean;
  data?: {
    url: string;
  };
  message?: string;
}

interface CropImage {
  file: File;
  url: string;
  naturalWidth: number;
  naturalHeight: number;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getCoverDimensions(image: CropImage, cropSize: number, zoom: number) {
  const baseScale = Math.max(cropSize / image.naturalWidth, cropSize / image.naturalHeight);
  const scale = baseScale * zoom;

  return {
    width: image.naturalWidth * scale,
    height: image.naturalHeight * scale,
    scale,
  };
}

function clampOffset(offset: { x: number; y: number }, image: CropImage, cropSize: number, zoom: number) {
  const dimensions = getCoverDimensions(image, cropSize, zoom);
  const maxX = Math.max(0, (dimensions.width - cropSize) / 2);
  const maxY = Math.max(0, (dimensions.height - cropSize) / 2);

  return {
    x: clamp(offset.x, -maxX, maxX),
    y: clamp(offset.y, -maxY, maxY),
  };
}

export default function ImageUploader({
  label,
  assetType,
  value,
  onUploaded,
  disabled = false,
  enableCrop = false,
  ownerType,
  ownerId,
}: ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cropImage, setCropImage] = useState<CropImage | null>(null);
  const [cropSize, setCropSize] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragStartRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(
    null,
  );

  const inputId = useMemo(() => `${assetType}-upload-input`, [assetType]);

  useEffect(() => {
    if (!cropImage) {
      return;
    }

    const updateCropSize = () => {
      setCropSize(Math.min(320, Math.max(240, window.innerWidth - 48)));
    };

    updateCropSize();
    window.addEventListener("resize", updateCropSize);

    return () => window.removeEventListener("resize", updateCropSize);
  }, [cropImage]);

  useEffect(() => {
    if (!cropImage) {
      return;
    }

    setOffset((currentOffset) => clampOffset(currentOffset, cropImage, cropSize, zoom));
  }, [cropImage, cropSize, zoom]);

  useEffect(() => {
    if (!cropImage) {
      return;
    }

    return () => URL.revokeObjectURL(cropImage.url);
  }, [cropImage]);

  const uploadFile = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("assetType", assetType);
      if (value) {
        formData.append("currentUrl", value);
      }
      if (ownerType && ownerId) {
        formData.append("ownerType", ownerType);
        formData.append("ownerId", ownerId);
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
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    setError(null);

    try {
      if (!enableCrop) {
        await uploadFile(file);
        return;
      }

      const imageUrl = URL.createObjectURL(file);
      const image = new Image();
      image.src = imageUrl;
      await image.decode();

      setCropImage({
        file,
        url: imageUrl,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      });
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "Error al subir imagen";
      setError(message);
    } finally {
      event.target.value = "";
    }
  };

  const closeCropEditor = () => {
    setCropImage(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    dragStartRef.current = null;
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropImage) {
      return;
    }

    event.currentTarget.setPointerCapture(event.pointerId);
    dragStartRef.current = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
    };
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!cropImage || !dragStartRef.current || dragStartRef.current.pointerId !== event.pointerId) {
      return;
    }

    const nextOffset = {
      x: dragStartRef.current.offsetX + event.clientX - dragStartRef.current.x,
      y: dragStartRef.current.offsetY + event.clientY - dragStartRef.current.y,
    };

    setOffset(clampOffset(nextOffset, cropImage, cropSize, zoom));
  };

  const handlePointerUp = (event: PointerEvent<HTMLDivElement>) => {
    if (dragStartRef.current?.pointerId === event.pointerId) {
      dragStartRef.current = null;
    }
  };

  const handleZoomChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextZoom = Number(event.target.value);
    setZoom(nextZoom);
  };

  const handleCropKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!cropImage) {
      return;
    }

    if (event.key === "Escape") {
      closeCropEditor();
      return;
    }

    const offsetByKey: Record<string, { x: number; y: number }> = {
      ArrowUp: { x: 0, y: -10 },
      ArrowDown: { x: 0, y: 10 },
      ArrowLeft: { x: -10, y: 0 },
      ArrowRight: { x: 10, y: 0 },
    };
    const movement = offsetByKey[event.key];

    if (!movement) {
      return;
    }

    event.preventDefault();
    setOffset((currentOffset) =>
      clampOffset(
        {
          x: currentOffset.x + movement.x,
          y: currentOffset.y + movement.y,
        },
        cropImage,
        cropSize,
        zoom,
      ),
    );
  };

  const uploadCroppedImage = async () => {
    if (!cropImage) {
      return;
    }

    const outputSize = 800;
    const canvas = document.createElement("canvas");
    canvas.width = outputSize;
    canvas.height = outputSize;

    const context = canvas.getContext("2d");
    if (!context) {
      setError("No se pudo preparar el recorte");
      return;
    }

    const dimensions = getCoverDimensions(cropImage, cropSize, zoom);
    const displayedLeft = cropSize / 2 - dimensions.width / 2 + offset.x;
    const displayedTop = cropSize / 2 - dimensions.height / 2 + offset.y;
    const sourceX = Math.max(0, -displayedLeft / dimensions.scale);
    const sourceY = Math.max(0, -displayedTop / dimensions.scale);
    const sourceSize = cropSize / dimensions.scale;
    const image = new Image();
    image.src = cropImage.url;
    await image.decode();

    context.drawImage(image, sourceX, sourceY, sourceSize, sourceSize, 0, 0, outputSize, outputSize);

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
    if (!blob) {
      setError("No se pudo generar la imagen recortada");
      return;
    }

    const croppedFile = new File([blob], `${cropImage.file.name.replace(/\.[^.]+$/, "")}-perfil.png`, {
      type: "image/png",
    });

    closeCropEditor();
    await uploadFile(croppedFile);
  };

  const cropDimensions = cropImage ? getCoverDimensions(cropImage, cropSize, zoom) : null;

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

      {cropImage && cropDimensions && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4 py-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`${inputId}-crop-title`}
        >
          <div className="w-full max-w-md rounded-lg bg-white p-5 shadow-xl">
            <div className="mb-4">
              <h2 id={`${inputId}-crop-title`} className="text-lg font-semibold text-gray-900">
                Ajustar foto de perfil
              </h2>
              <p className="mt-1 text-sm text-gray-600">Arrastra la imagen y ajusta el zoom para recortarla 1:1.</p>
            </div>

            <div className="flex justify-center">
              <div
                className="relative overflow-hidden rounded-lg bg-gray-900 touch-none cursor-move"
                style={{ width: cropSize, height: cropSize }}
                role="application"
                tabIndex={0}
                aria-label="Area de recorte. Use las flechas para mover la imagen."
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
                onKeyDown={handleCropKeyDown}
              >
                {/* eslint-disable-next-line @next/next/no-img-element -- The crop editor previews a local blob URL before upload. */}
                <img
                  src={cropImage.url}
                  alt="Vista previa del recorte"
                  draggable={false}
                  className="absolute left-1/2 top-1/2 max-w-none select-none"
                  style={{
                    width: cropDimensions.width,
                    height: cropDimensions.height,
                    transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px))`,
                  }}
                />
                <div className="pointer-events-none absolute inset-0 ring-2 ring-white/90" />
                <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.24)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.24)_1px,transparent_1px)] bg-[size:33.333%_33.333%]" />
              </div>
            </div>

            <label htmlFor={`${inputId}-zoom`} className="mt-5 block text-sm font-medium text-gray-700">
              Zoom
            </label>
            <input
              id={`${inputId}-zoom`}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step="0.01"
              value={zoom}
              onChange={handleZoomChange}
              className="mt-2 w-full accent-green-600"
            />

            <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeCropEditor}
                disabled={isUploading}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={uploadCroppedImage}
                disabled={isUploading}
                className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                Usar foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
