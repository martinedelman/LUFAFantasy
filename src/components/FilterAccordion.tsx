"use client";

import { ReactNode, useState } from "react";

interface FilterAccordionProps {
  children: ReactNode;
  title?: string;
  defaultOpen?: boolean;
  className?: string;
  buttonClassName?: string;
  contentClassName?: string;
}

export default function FilterAccordion({
  children,
  title = "Filtros",
  defaultOpen = false,
  className = "",
  buttonClassName = "flex w-full items-center justify-between gap-3 px-6 py-4 text-left text-sm font-semibold text-gray-900",
  contentClassName = "px-6 pb-6",
}: FilterAccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        className={buttonClassName}
      >
        <span>{title}</span>
        <svg
          className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? "rotate-180" : "rotate-0"}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {isOpen && <div className={contentClassName}>{children}</div>}
    </div>
  );
}
