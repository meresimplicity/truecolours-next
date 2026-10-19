export class CommandRequestError extends Error {
  readonly status: 403 | 415;

  constructor(message: string, status: 403 | 415 = 403) {
    super(message);
    this.name = "CommandRequestError";
    this.status = status;
  }
}

export function assertSameOriginMutation(request: Request) {
  if (request.headers.get("sec-fetch-site")?.toLowerCase() === "cross-site") {
    throw new CommandRequestError("Cross-site commands are not allowed.");
  }
  const contentType = request.headers
    .get("content-type")
    ?.split(";", 1)[0]
    .trim()
    .toLowerCase();
  if (contentType !== "application/json") {
    throw new CommandRequestError("Use an application/json request body.", 415);
  }
  const origin = request.headers.get("origin");
  if (!origin) return;
  try {
    const requestUrl = new URL(request.url);
    // Next.js can reconstruct request.url with its bind hostname (localhost),
    // while the browser sent Host: 127.0.0.1. Compare the actual HTTP authority.
    // Do not trust arbitrary X-Forwarded-Host values supplied by clients.
    const host = request.headers.get("host") || requestUrl.host;
    const expected = new URL(`${requestUrl.protocol}//${host}`);
    const supplied = new URL(origin);
    if (
      expected.host.toLowerCase() !== host.toLowerCase() ||
      supplied.origin !== expected.origin ||
      supplied.origin !== origin
    ) {
      throw new CommandRequestError("The request origin is not allowed.");
    }
  } catch (error) {
    if (error instanceof CommandRequestError) throw error;
    throw new CommandRequestError("The request origin is not allowed.");
  }
}

export function isCommandRequestError(
  error: unknown,
): error is CommandRequestError {
  return error instanceof CommandRequestError;
}
