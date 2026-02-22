import React from "react";
import Link from "next/link";

interface CardAction {
  label: string;
  href?: string;
  onClick?: () => void;
  className?: string;
}

interface CardProps {
  id?: string;
  title: string;
  subtitle?: string;
  icon?: {
    type: "initials" | "image" | "jersey";
    value: string;
    backgroundColor?: string;
    alt?: string;
  };
  badge?: React.ReactNode;
  info?: Array<{
    icon?: React.ReactNode;
    text: string;
  }>;
  colors?: {
    primary: string;
    secondary?: string;
  };
  footer?: {
    text: string;
    date?: string;
  };
  actions?: CardAction[];
  onCardClick?: () => void;
}

export default function Card({ title, subtitle, icon, badge, info, colors, footer, actions, onCardClick }: CardProps) {
  const getIcon = () => {
    if (!icon) return null;

    const baseClasses = "w-12 h-12 flex items-center justify-center text-white font-bold";

    switch (icon.type) {
      case "image":
        return (
          <div
            className="w-12 h-12 rounded-full bg-white border border-gray-200 bg-cover bg-center"
            style={{ backgroundImage: `url(${icon.value})` }}
            role="img"
            aria-label={icon.alt || "Icon"}
          />
        );
      case "jersey":
        return (
          <div
            className={`${baseClasses} rounded-full text-lg`}
            style={{ backgroundColor: icon.backgroundColor || "#666" }}
          >
            {icon.value}
          </div>
        );
      case "initials":
      default:
        return (
          <div
            className={`${baseClasses} rounded-full`}
            style={{ backgroundColor: icon.backgroundColor || colors?.primary || "#666" }}
          >
            {icon.value}
          </div>
        );
    }
  };

  return (
    <div
      className="bg-slate-50 rounded-lg shadow-xs hover:shadow-md transition-shadow cursor-pointer"
      onClick={onCardClick}
    >
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            {getIcon()}
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {badge && <div>{badge}</div>}
        </div>

        {/* Info */}
        {info && info.length > 0 && (
          <div className="space-y-2 mb-4">
            {info.map((item, idx) => (
              <div key={idx} className="flex items-center text-sm text-gray-600">
                {item.icon && <div className="mr-2">{item.icon}</div>}
                <span>{item.text}</span>
              </div>
            ))}
          </div>
        )}

        {/* Colors */}
        {colors && (
          <div className="flex items-center space-x-2 mb-4">
            <span className="text-xs font-medium text-gray-500">Colores:</span>
            <div className="w-4 h-4 rounded border border-gray-300" style={{ backgroundColor: colors.primary }}></div>
            {colors.secondary && (
              <div
                className="w-4 h-4 rounded border border-gray-300"
                style={{ backgroundColor: colors.secondary }}
              ></div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-2">
            {actions?.map((action, idx) => (
              <React.Fragment key={idx}>
                {action.href ? (
                  <Link
                    href={action.href}
                    className={action.className || "text-green-600 hover:text-green-800 text-sm font-medium"}
                    onClick={(e) => e.stopPropagation()}
                  >
                    {action.label}
                  </Link>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      action.onClick?.();
                    }}
                    className={action.className || "text-green-600 hover:text-green-800 text-sm font-medium"}
                  >
                    {action.label}
                  </button>
                )}
              </React.Fragment>
            ))}
          </div>
          {footer?.date && <span className="text-xs text-gray-400">{footer.date}</span>}
        </div>
      </div>
    </div>
  );
}
