import type { ErrorResponse } from "@/lib/errors";

export type ActionResult<T = void> = { success: true; data?: T } | ErrorResponse;
