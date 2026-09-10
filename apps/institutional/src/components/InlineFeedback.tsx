import type { ReactNode } from "react";

export type FeedbackVariant = "info" | "warning" | "error" | "success";

interface InlineFeedbackProps {
  variant?: FeedbackVariant;
  title?: string;
  message: ReactNode;
  action?: ReactNode;
  className?: string;
  compact?: boolean;
}

const variantStyles: Record<FeedbackVariant, { container: string; icon: string; title: string; body: string }> = {
  info: {
    container: "border-blue-200 bg-blue-50",
    icon: "text-blue-600",
    title: "text-blue-900",
    body: "text-blue-800",
  },
  warning: {
    container: "border-amber-200 bg-amber-50",
    icon: "text-amber-600",
    title: "text-amber-900",
    body: "text-amber-800",
  },
  error: {
    container: "border-red-200 bg-red-50",
    icon: "text-red-600",
    title: "text-red-900",
    body: "text-red-800",
  },
  success: {
    container: "border-green-200 bg-green-50",
    icon: "text-green-600",
    title: "text-green-900",
    body: "text-green-800",
  },
};

const defaultTitles: Record<FeedbackVariant, string> = {
  info: "Información",
  warning: "Atención",
  error: "No se pudo completar",
  success: "Listo",
};

function FeedbackIcon({ variant }: { variant: FeedbackVariant }) {
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

  if (variant === "success") {
    return <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="m5 13 4 4L19 7" />;
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

export default function InlineFeedback({
  variant = "info",
  title,
  message,
  action,
  className = "",
  compact = false,
}: InlineFeedbackProps) {
  const styles = variantStyles[variant];
  const role = variant === "error" || variant === "warning" ? "alert" : "status";

  return (
    <div
      className={`rounded-md border ${styles.container} ${compact ? "px-3 py-2" : "p-4"} ${className}`}
      role={role}
      aria-live={variant === "error" ? "assertive" : "polite"}
    >
      <div className="flex gap-3">
        <svg className={`mt-0.5 h-5 w-5 shrink-0 ${styles.icon}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
          <FeedbackIcon variant={variant} />
        </svg>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-semibold ${styles.title}`}>{title || defaultTitles[variant]}</p>
          <div className={`mt-1 text-sm leading-5 ${styles.body}`}>{message}</div>
          {action && <div className="mt-3">{action}</div>}
        </div>
      </div>
    </div>
  );
}
