import { Request, Response, NextFunction } from 'express';
import { ZodError, ZodIssue } from 'zod';

// Typed application error — no `any`, uses proper interface
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;

  constructor(message: string, statusCode: number, code: string) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    // Ensures instanceof works correctly across transpilation
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  // Zod validation errors
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation Error',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: err.issues.map((e: ZodIssue) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Our typed AppError
  if (err instanceof AppError) {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        requestId: req.headers['x-request-id'],
        method: req.method,
        path: req.path,
        error: err.message,
        statusCode: err.statusCode,
        code: err.code,
      }),
    );
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code,
      statusCode: err.statusCode,
    });
    return;
  }

  // Unknown / unexpected errors
  const message = err instanceof Error ? err.message : 'An unexpected error occurred';
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'],
      method: req.method,
      path: req.path,
      error: message,
      stack: err instanceof Error ? err.stack : undefined,
      statusCode: 500,
    }),
  );
  res.status(500).json({
    error: message,
    code: 'INTERNAL_SERVER_ERROR',
    statusCode: 500,
  });
};
