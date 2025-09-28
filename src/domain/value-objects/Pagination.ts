export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationResult {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export class Pagination {
  public readonly page: number;
  public readonly limit: number;
  public readonly offset: number;

  constructor(page = 1, limit = 20) {
    if (page < 1) {
      throw new Error('Page must be greater than 0');
    }
    if (limit < 1 || limit > 100) {
      throw new Error('Limit must be between 1 and 100');
    }

    this.page = page;
    this.limit = limit;
    this.offset = (page - 1) * limit;
  }

  public createResult(total: number): PaginationResult {
    const totalPages = Math.ceil(total / this.limit);
    return {
      total,
      page: this.page,
      limit: this.limit,
      totalPages,
      hasNext: this.page < totalPages,
      hasPrev: this.page > 1,
    };
  }
}
