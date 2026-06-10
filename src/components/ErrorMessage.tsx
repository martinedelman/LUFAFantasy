import InlineFeedback from "@/components/InlineFeedback";

interface ErrorMessageProps {
  message: string;
  onRetry?: () => void;
  title?: string;
}

export default function ErrorMessage({ message, onRetry, title = "No se pudo cargar la información" }: ErrorMessageProps) {
  return (
    <InlineFeedback
      variant="error"
      title={title}
      message={message}
      action={
        onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-md bg-red-100 px-3 py-2 text-sm font-medium text-red-900 transition hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
          >
            Reintentar
          </button>
        ) : undefined
      }
    />
  );
}
