"use client";

import { useEffect } from "react";
import type { FeedbackVariant } from "@/components/InlineFeedback";

interface ToastProps {
  open: boolean;
  variant?: FeedbackVariant;
  title?: string;
  message: string;
  durationMs?: number | null;
  onClose: () => void;
}

const variantStyles: Record<FeedbackVariant, { container: string; icon: string; title: string; body: string }> = {
  info: {
    container: "border-blue-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]",
    icon: "text-blue-600",
    title: "text-slate-950",
    body: "text-slate-700",
  },
  warning: {
    container: "border-amber-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]",
    icon: "text-amber-600",
    title: "text-slate-950",
    body: "text-slate-700",
  },
  error: {
    container: "border-red-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.2)]",
    icon: "text-red-600",
    title: "text-slate-950",
    body: "text-slate-700",
  },
  success: {
    container: "border-green-200 bg-white shadow-[0_18px_40px_rgba(15,23,42,0.18)]",
    icon: "text-green-600",
    title: "text-slate-950",
    body: "text-slate-700",
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
  useEffect(() => {
    if (!open || durationMs === null) return;

    const timeout = window.setTimeout(onClose, durationMs);
    return () => window.clearTimeout(timeout);
  }, [durationMs, onClose, open]);

  if (!open) return null;

  const styles = variantStyles[variant];

  return (
    <div className="fixed inset-x-0 top-4 z-[70] flex justify-center px-4 sm:justify-end" aria-live="polite">
      <div
        className={`w-full max-w-sm rounded-lg border p-4 transition ${styles.container}`}
        role={variant === "error" || variant === "warning" ? "alert" : "status"}
      >
        <div className="flex gap-3">
          <svg className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <ToastIcon variant={variant} />
          </svg>
          <div className="min-w-0 flex-1">
            <p className={`text-sm font-semibold ${styles.title}`}>{title || defaultTitles[variant]}</p>
            <p className={`mt-1 text-sm leading-5 ${styles.body}`}>{message}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
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
