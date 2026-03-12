import { NextResponse } from "next/server";
import { toAppError } from "./errors";

export async function handleApi<T>(handler: () => Promise<NextResponse<T>>) {
  try {
    return await handler();
  } catch (err) {
    const appError = toAppError(err);
    return NextResponse.json(
      { error: appError.code, message: appError.message },
      { status: appError.status }
    ) as NextResponse<T>;
  }
}
