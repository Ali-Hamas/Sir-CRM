export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function parsePaginationParams(params: PaginationParams, defaultLimit: number = 20) {
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || defaultLimit));
  const skip = (page - 1) * limit;
  const sortOrder = params.sortOrder === 'asc' ? 'asc' : 'desc';
  const sortBy = params.sortBy || 'createdAt';

  return {
    page,
    limit,
    skip,
    search: params.search?.trim() || '',
    sortBy,
    sortOrder,
  };
}

export function createPaginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
): PaginatedResult<T> {
  const totalPages = Math.ceil(total / limit) || 1;
  return {
    data,
    meta: {
      total,
      page,
      limit,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    },
  };
}
