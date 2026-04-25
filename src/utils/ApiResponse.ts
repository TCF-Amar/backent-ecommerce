/**
 * Standardized API response wrapper.
 * Every response from this API follows: { success, message, data?, meta? }
 * This prevents frontend from dealing with inconsistent response shapes.
 */
export class ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  meta?: Record<string, unknown>;

  constructor(
    public statusCode: number,
    message: string,
    data?: T,
    meta?: Record<string, unknown>
  ) {
    this.success = statusCode < 400;
    this.message = message;
    this.data = data;
    this.meta = meta;
  }
}
