import { randomUUID } from 'node:crypto';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3001';

export class ApiClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'DELETE';
  body?: unknown;
  cache?: RequestCache;
  next?: { revalidate?: number; tags?: string[] };
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const correlationId = randomUUID();
  const headers: Record<string, string> = {
    'x-correlation-id': correlationId,
    accept: 'application/json',
  };
  if (options.body !== undefined) headers['content-type'] = 'application/json';

  const res = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    cache: options.cache ?? 'no-store',
    next: options.next,
  });

  if (!res.ok) {
    let code = 'HTTP_ERROR';
    let message = `Request failed with status ${res.status}`;
    try {
      const data = (await res.json()) as { error?: { code?: string; message?: string } };
      if (data.error?.code) code = data.error.code;
      if (data.error?.message) message = data.error.message;
    } catch {
      /* ignore */
    }
    throw new ApiClientError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}
