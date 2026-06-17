/**
 * Custom operational API Error class for standardizing error responses across Syntra Core.
 */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errors?: any;

  constructor(statusCode: number, message: string, errors?: any) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.name = this.constructor.name;

    // Capture stack trace for cleaner debugging, skipping this constructor block
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}
