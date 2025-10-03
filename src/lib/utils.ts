export async function requireJson<T = unknown>(request: Request): Promise<T> {
  const contentType = request.headers.get("content-type") ?? "";
  if (!contentType.toLowerCase().includes("application/json")) {
    throw new JsonBodyError("Request body must be in application/json format.", 415);
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to parse JSON body.";
    throw new JsonBodyError(message, 400);
  }

  return payload as T;
}

export class JsonBodyError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "JsonBodyError";
    this.status = status;
  }
}
