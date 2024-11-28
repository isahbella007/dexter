import { FilterQuery, Model, Document } from 'mongoose';
import { ErrorBuilder } from '../errors/ErrorBuilder';
import { handleError } from './general';
import { PaginatedResponse, PaginationOptions, PaginationQuery } from '../../types/pagination';

export class PaginationHelper {
  static extractPaginationOptions(query: PaginationQuery): PaginationOptions {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 10));

    const sort: Record<string, 1 | -1> = {};
    if (query.sortBy) {
      sort[query.sortBy] = query.sortOrder === 'desc' ? -1 : 1;
    } else {
      sort['createdAt'] = -1; // Default sort
    }

    return { page, limit, sort };
  }

  static async paginate<T extends Document>(
    model: Model<T>,
    query: FilterQuery<T>,
    options: PaginationOptions,
    populate?: string | string[]
  ): Promise<PaginatedResponse<T>> {
    try {
      const skip = (options.page - 1) * options.limit;

      const [data, total] = await Promise.all([
        model
          .find(query)
          .sort(options.sort)
          .skip(skip)
          .limit(options.limit)
          .populate(populate || []),
        model.countDocuments(query),
      ]);

      const totalPages = Math.ceil(total / options.limit);

      return {
        data,
        metadata: {
          total,
          page: options.page,
          limit: options.limit,
          totalPages,
          hasNextPage: options.page < totalPages,
          hasPreviousPage: options.page > 1,
        },
      };
    } catch (error) {
      throw handleError(error, 'paginate', { query, options, populate });
    }
  }
}
