// src/lib/fetcher.ts

export interface FetcherOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class FetcherError extends Error {
  status: number;
  statusText: string;
  data?: any;

  constructor(message: string, status: number, statusText: string, data?: any) {
    super(message);
    this.name = "FetcherError";
    this.status = status;
    this.statusText = statusText;
    this.data = data;
  }
}

/**
 * Standardized, type-safe fetch wrapper for client-side API operations.
 * Automatically handles JSON serialization, default credentials, query params, and error classification.
 */
export async function fetcher<T = any>(
  url: string,
  options: FetcherOptions = {}
): Promise<T> {
  const { params, headers, ...rest } = options;

  let targetUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        searchParams.append(key, String(val));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      targetUrl += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const defaultHeaders: Record<string, string> = {};

  // Automatically attach Content-Type: application/json if body is present and not binary/multipart
  if (rest.body && !(rest.body instanceof FormData) && !(rest.body instanceof Blob)) {
    defaultHeaders["Content-Type"] = "application/json";
  }

  const config: RequestInit = {
    credentials: "include",
    ...rest,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
  };

  // Automatically stringify request body if it is a plain object/array
  if (
    config.body &&
    typeof config.body === "object" &&
    !(config.body instanceof FormData) &&
    !(config.body instanceof Blob)
  ) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(targetUrl, config);

  if (!response.ok) {
    let errorData: any;
    try {
      errorData = await response.json();
    } catch {
      try {
        errorData = await response.text();
      } catch {
        errorData = null;
      }
    }
    const message =
      errorData?.message ||
      errorData?.error ||
      `Request failed with status: ${response.status}`;

    throw new FetcherError(
      message,
      response.status,
      response.statusText,
      errorData
    );
  }

  // Safe fallback for 204 No Content responses
  if (response.status === 204) {
    return {} as T;
  }

  return response.json() as Promise<T>;
}
