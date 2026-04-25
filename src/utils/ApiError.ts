/**
 * Custom error class that carries an HTTP status code.
 * Throwing this anywhere in the app allows the global error middleware
 * to catch it and send a consistent JSON error response.
 */
export class ApiError extends Error {
  statusCode: number;
  errors?: unknown[];

  constructor(statusCode: number, message: string, errors?: unknown[]) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    // Maintains proper stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}
