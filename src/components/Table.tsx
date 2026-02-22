import React from "react";
import Link from "next/link";

export interface TableColumn {
  key: string;
  label: string;
  render?: (value: unknown, item: unknown) => React.ReactNode;
  sortable?: boolean;
}

export interface TableAction {
  label: string;
  href?: (id: string) => string;
  onClick?: (id: string) => void;
  className?: string;
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, unknown>[];
  actions?: TableAction[];
  onRowClick?: (item: Record<string, unknown>) => void;
  emptyMessage?: string;
  emptyIcon?: React.ReactNode;
  loading?: boolean;
  idKey?: string;
}

export default function Table({
  columns,
  data,
  actions,
  onRowClick,
  emptyMessage = "No hay datos",
  emptyIcon,
  loading = false,
  idKey = "_id",
}: TableProps) {
  if (loading) {
    return (
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="flex justify-center items-center min-h-[300px]">
          <div className="text-gray-500">Cargando...</div>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white shadow-sm rounded-lg overflow-hidden">
        <div className="text-center py-12">
          {emptyIcon && <div className="flex justify-center mb-4">{emptyIcon}</div>}
          <h3 className="text-sm font-medium text-gray-900">{emptyMessage}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                >
                  {column.label}
                </th>
              ))}
              {actions && actions.length > 0 && (
                <th className="relative px-6 py-3">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {data.map((item) => (
              <tr
                key={String(item[idKey])}
                className="hover:bg-slate-50 hover:dark:bg-slate-900 cursor-pointer"
                onClick={() => onRowClick?.(item)}
              >
                {columns.map((column) => (
                  <td
                    key={`${item[idKey]}-${column.key}`}
                    className="px-6 py-4 whitespace-nowrap text-sm text-gray-900"
                  >
                    {column.render ? column.render(item[column.key], item) : String(item[column.key] || "")}
                  </td>
                ))}
                {actions && actions.length > 0 && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    {actions.map((action, idx) => (
                      <React.Fragment key={idx}>
                        {action.href ? (
                          <Link
                            href={action.href(String(item[idKey]))}
                            className={action.className || "text-green-600 hover:text-green-900"}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {action.label}
                          </Link>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              action.onClick?.(String(item[idKey]));
                            }}
                            className={action.className || "text-green-600 hover:text-green-900"}
                          >
                            {action.label}
                          </button>
                        )}
                      </React.Fragment>
                    ))}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
