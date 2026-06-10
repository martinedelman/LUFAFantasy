"use client";

import type { CSSProperties, PointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import type { FeedbackVariant } from "@/components/InlineFeedback";

interface ToastProps {
  open: boolean;
  variant?: FeedbackVariant;
  title?: string;
  message: string;
  durationMs?: number | null;
  onClose: () => void;
}

const EXIT_ANIMATION_MS = 220;
const DRAG_CLOSE_THRESHOLD = -44;
const DRAG_RESISTANCE = 0.35;

const variantStyles: Record<
  FeedbackVariant,
  { container: string; icon: string; title: string; body: string; closeButton: string }
> = {
  info: {
    container: "border-blue-700 bg-blue-600 text-white shadow-[0_18px_40px_rgba(37,99,235,0.3)]",
    icon: "text-blue-50",
    title: "text-white",
    body: "text-blue-50",
    closeButton: "text-blue-50 hover:bg-white/15 hover:text-white focus:ring-blue-100",
  },
  warning: {
    container: "border-orange-500 bg-orange-400 text-slate-950 shadow-[0_18px_40px_rgba(251,146,60,0.32)]",
    icon: "text-slate-950",
    title: "text-slate-950",
    body: "text-slate-900",
    closeButton: "text-slate-900 hover:bg-black/10 hover:text-slate-950 focus:ring-orange-900",
  },
  error: {
    container: "border-red-700 bg-red-600 text-white shadow-[0_18px_40px_rgba(220,38,38,0.32)]",
    icon: "text-red-50",
    title: "text-white",
    body: "text-red-50",
    closeButton: "text-red-50 hover:bg-white/15 hover:text-white focus:ring-red-100",
  },
  success: {
    container: "border-green-700 bg-green-600 text-white shadow-[0_18px_40px_rgba(22,163,74,0.28)]",
    icon: "text-green-50",
    title: "text-white",
    body: "text-green-50",
    closeButton: "text-green-50 hover:bg-white/15 hover:text-white focus:ring-green-100",
  },
};

const defaultTitles: Record<FeedbackVariant, string> = {
  info: "Información",
  warning: "Atención",
  error: "No se pudo completar",
  success: "Listo",
};

function ToastIcon({ variant }: { variant: FeedbackVariant }) {
  if (variant === "success") {
    return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 13 4 4L19 7" />;
  }

  if (variant === "info") {
    return (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M11 11h1v5h1m-1-8h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
      />
    );
  }

  return (
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M12 9v4m0 4h.01M10.3 4.1 2.8 17a2 2 0 0 0 1.7 3h15a2 2 0 0 0 1.7-3L13.7 4.1a2 2 0 0 0-3.4 0Z"
    />
  );
}

export default function Toast({
  open,
  variant = "info",
  title,
  message,
  durationMs = variant === "info" ? 5000 : null,
  onClose,
}: ToastProps) {
  const [shouldRender, setShouldRender] = useState(open);
  const [isLeaving, setIsLeaving] = useState(false);
  const [dragY, setDragY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const toastRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (open) {
      setShouldRender(true);
      setIsLeaving(false);
      setDragY(0);
      setIsDragging(false);
      return;
    }

    if (!shouldRender) return;

    setIsLeaving(true);
    const timeout = window.setTimeout(() => {
      setShouldRender(false);
      setIsLeaving(false);
    }, EXIT_ANIMATION_MS);

    return () => window.clearTimeout(timeout);
  }, [open, shouldRender]);

  useEffect(() => {
    if (!open || durationMs === null) return;

    const timeout = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, onClose, open]);

  if (!shouldRender) return null;

  const styles = variantStyles[variant];
  const dragOpacity = Math.max(0.35, 1 - Math.abs(Math.min(0, dragY)) / 130);

  const closeWithAnimation = () => {
    if (isLeaving) return;

    setIsLeaving(true);
    window.setTimeout(onClose, EXIT_ANIMATION_MS);
  };

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (isLeaving) return;

    dragStartYRef.current = event.clientY;
    setIsDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging || isLeaving) return;

    const deltaY = event.clientY - dragStartYRef.current;
    const nextDragY = deltaY < 0 ? deltaY : deltaY * DRAG_RESISTANCE;
    setDragY(nextDragY);
  };

  const handlePointerEnd = (event: PointerEvent<HTMLDivElement>) => {
    if (!isDragging) return;

    event.currentTarget.releasePointerCapture(event.pointerId);
    setIsDragging(false);

    if (dragY <= DRAG_CLOSE_THRESHOLD) {
      setIsLeaving(true);
      window.setTimeout(onClose, EXIT_ANIMATION_MS);
      return;
    }

    setDragY(0);
  };

  return (
    <div className="fixed inset-x-0 top-4 z-[70] flex justify-center px-4 sm:justify-end" aria-live="polite">
      <div
        ref={toastRef}
        className={`toast-motion ${isLeaving ? "is-leaving" : "is-entering"} ${
          isDragging ? "is-dragging" : ""
        } w-full max-w-sm touch-none select-none rounded-2xl border p-4 ${styles.container}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
        role={variant === "error" || variant === "warning" ? "alert" : "status"}
        style={
          {
            "--toast-drag-y": `${dragY}px`,
            "--toast-opacity": dragOpacity,
          } as CSSProperties
        }
      >
        <div className="flex gap-3">
          <svg
            className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <ToastIcon variant={variant} />
          </svg>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-bold ${styles.title}`}>{title || defaultTitles[variant]}</p>
            <p className={`mt-1 text-sm font-semibold leading-5 ${styles.body}`}>{message}</p>
          </div>
          <button
            type="button"
            onPointerDown={(event) => event.stopPropagation()}
            onPointerMove={(event) => event.stopPropagation()}
            onPointerUp={(event) => event.stopPropagation()}
            onPointerCancel={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation();
              closeWithAnimation();
            }}
            className={`rounded-md p-1 transition focus:outline-none focus:ring-2 ${styles.closeButton}`}
            aria-label="Cerrar mensaje"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
