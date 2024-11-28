// src/utils/pagination.ts

import { FilterQuery, Model } from 'mongoose';

interface PaginationOptions {
  page?: number;
  limit?: number;
  sort?: Record<string, 1 | -1>;
}

interface PaginationResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: PaginationInfo;
}

export async function paginateResults<T>(
  model: Model<T>,
  query: FilterQuery<T>,
  options: PaginationOptions = {}
): Promise<PaginationResult<T>> {
  const page = Math.max(1, options.page || 1);
  const limit = Math.max(1, Math.min(100, options.limit || 10)); // Ensure limit is between 1 and 100
  const skip = (page - 1) * limit;
  const sort = options.sort || { createdAt: -1 };

  const [data, total] = await Promise.all([
    model.find(query).sort(sort).skip(skip).limit(limit).exec(),
    model.countDocuments(query),
  ]);

  const totalPages = Math.ceil(total / limit);

  return {
    data,
    total,
    page,
    limit,
    totalPages,
  };
}

export function extractPagination<T>(result: {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}): PaginatedResult<T> {
  const { data, ...paginationInfo } = result;
  return {
    data,
    pagination: paginationInfo,
  };
}
