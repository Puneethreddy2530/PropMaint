import { z } from "zod";

export type ErrorCode =
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION_ERROR"
  | "BAD_REQUEST"
  | "CONFLICT"
  | "INTERNAL";

export interface ErrorResponse {
  error: ErrorCode;
  message: string;
}

export class AppError extends Error {
  code: ErrorCode;
  status: number;

  constructor(code: ErrorCode, message: string, status: number) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  if (err instanceof z.ZodError) {
    const message = err.issues[0]?.message || "Invalid request";
    return new AppError("VALIDATION_ERROR", message, 400);
  }

  if (err instanceof Error) {
    return new AppError("INTERNAL", "Something went wrong. Please try again.", 500);
  }

  return new AppError("INTERNAL", "Something went wrong. Please try again.", 500);
}

export function toErrorResponse(err: unknown): ErrorResponse {
  const appError = toAppError(err);
  return { error: appError.code, message: appError.message };
}

export function assertAuthorized(condition: boolean, message: string) {
  if (!condition) {
    throw new AppError("FORBIDDEN", message, 403);
  }
}
