export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginationMeta {
  current: number;
  total: number;
  pages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export function parsePaginationParams(
  searchParams: URLSearchParams,
  defaultLimit = 10,
): PaginationParams {
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || String(defaultLimit));
  return { page, limit };
}

export function paginate<T>(items: T[], params: PaginationParams): { data: T[]; pagination: PaginationMeta } {
  const total = items.length;
  const startIndex = (params.page - 1) * params.limit;
  const endIndex = startIndex + params.limit;
  const data = items.slice(startIndex, endIndex);

  return {
    data,
    pagination: {
      current: params.page,
      total: Math.ceil(total / params.limit),
      pages: Math.ceil(total / params.limit),
      hasNext: endIndex < total,
      hasPrev: params.page > 1,
    },
  };
}
