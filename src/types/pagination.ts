export interface PaginationQuery {
    page?: string | number;
    limit?: string | number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
    search?: string;
  }
  
  export interface PaginationOptions {
    page: number;
    limit: number;
    sort?: Record<string, 1 | -1>;
    populate?: string | string[];
  }
  
  export interface PaginationMeta {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  }
  
  export interface PaginatedResponse<T> {
    data: T[];
    metadata: PaginationMeta;
  }
  