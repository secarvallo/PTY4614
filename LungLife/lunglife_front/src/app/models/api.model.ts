export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

export interface PaginatedResponse<T> extends ApiResponse<T> {
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface ApiError {
  status: number;
  message: string;
  timestamp?: string;
  path?: string;
}

export interface HttpOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  // Only allow JSON to keep strong typing with HttpClient<ResponseType>
  responseType?: 'json';
}
