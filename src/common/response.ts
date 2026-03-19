export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export function successResponse<T>(data: T, message = 'ok'): ApiResponse<T> {
  return {
    code: 0,
    message,
    data,
  };
}
