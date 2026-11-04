import { NextResponse } from "next/server";
import { AuthorizationError } from "@/lib/permissions";
import { InputError, asObject } from "@/lib/validation";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export async function readJson<T>(request: Request, validate: (value: unknown) => T): Promise<T> {
  assertSameOrigin(request);
  const contentType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new ApiError(415, "Send data as JSON.");
  const statedLength = Number(request.headers.get("content-length") ?? "0");
  if (statedLength > 12_000) throw new ApiError(413, "Request is too large.");
  const reader = request.body?.getReader();
  if (!reader) throw new ApiError(400, "Request body is missing.");
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > 12_000) {
      await reader.cancel();
      throw new ApiError(413, "Request is too large.");
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return validate(asObject(JSON.parse(new TextDecoder().decode(bytes))));
  } catch (error) {
    if (error instanceof InputError || error instanceof ApiError) throw error;
    throw new ApiError(400, "Request body must be valid JSON.");
  }
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (origin) {
    try {
      if (new URL(origin).origin !== new URL(request.url).origin) throw new ApiError(403, "Cross-origin requests are not allowed.");
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(403, "Request origin is invalid.");
    }
  } else if (request.headers.get("sec-fetch-site") === "cross-site") {
    throw new ApiError(403, "Cross-origin requests are not allowed.");
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof ApiError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof AuthorizationError) return NextResponse.json({ error: error.message }, { status: 403 });
  if (error instanceof InputError) return NextResponse.json({ error: error.message }, { status: 400 });
  if (error && typeof error === "object" && "code" in error && error.code === 11000) {
    return NextResponse.json({ error: "A record with those details already exists." }, { status: 409 });
  }
  if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
    return NextResponse.json({ error: "Record did not pass validation." }, { status: 400 });
  }
  return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
}
