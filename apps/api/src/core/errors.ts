export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'RATE_LIMITED'
  | 'AI_PROVIDER_ERROR'
  | 'INTERNAL_ERROR';

export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCode, message: string, statusCode = 500, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
  }
}

export const NotFoundError = (resource: string) =>
  new AppError('NOT_FOUND', `${resource} not found`, 404);

export const ValidationError = (message: string, details?: unknown) =>
  new AppError('VALIDATION_ERROR', message, 400, details);
