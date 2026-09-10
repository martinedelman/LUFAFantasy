"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import type { FeedbackVariant } from "@/components/InlineFeedback";

interface ModalAction {
  label: string;
  onClick: () => Promise<void> | void;
  variant?: "primary" | "danger" | "secondary";
  disabled?: boolean;
}

interface ModalProps {
  open: boolean;
  title: string;
  children: ReactNode;
  onClose: () => void;
  variant?: FeedbackVariant;
  primaryAction?: ModalAction;
  secondaryAction?: ModalAction;
  closeOnBackdrop?: boolean;
}

const iconColor: Record<FeedbackVariant, string> = {
  info: "text-blue-600 bg-blue-50",
  warning: "text-amber-600 bg-amber-50",
  error: "text-red-600 bg-red-50",
  success: "text-green-600 bg-green-50",
};

function ModalIcon({ variant }: { variant: FeedbackVariant }) {
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

function actionClasses(action?: ModalAction) {
  if (action?.variant === "danger") {
    return "bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-300";
  }

  if (action?.variant === "secondary") {
    return "border border-gray-300 bg-white text-gray-800 hover:bg-gray-50 focus:ring-gray-400 disabled:bg-gray-100";
  }

  return "bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 disabled:bg-green-300";
}

export default function Modal({
  open,
  title,
  children,
  onClose,
  variant = "info",
  primaryAction,
  secondaryAction,
  closeOnBackdrop = true,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/55 px-4 py-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg rounded-lg bg-white p-5 shadow-xl">
        <div className="flex items-start gap-3">
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${iconColor[variant]}`}>
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <ModalIcon variant={variant} />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <h2 id="modal-title" className="text-lg font-semibold text-gray-900">
              {title}
            </h2>
            <div className="mt-2 text-sm leading-6 text-gray-600">{children}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-md p-1 text-gray-500 transition hover:bg-gray-100 hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-gray-400"
            aria-label="Cerrar modal"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 6l12 12M18 6 6 18" />
            </svg>
          </button>
        </div>

        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            {secondaryAction && (
              <button
                type="button"
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                className={`rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed ${actionClasses({
                  ...secondaryAction,
                  variant: secondaryAction.variant || "secondary",
                })}`}
              >
                {secondaryAction.label}
              </button>
            )}
            {primaryAction && (
              <button
                type="button"
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                className={`rounded-md px-4 py-2 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed ${actionClasses(
                  primaryAction,
                )}`}
              >
                {primaryAction.label}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
