export interface ApiErrorShape {
  code: string
  message: string
  detail?: unknown
}

export class ApiClientError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
    public detail?: unknown,
  ) {
    super(message)
    this.name = 'ApiClientError'
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: init?.body ? { 'content-type': 'application/json', ...init?.headers } : init?.headers,
    ...init,
  })
  if (res.status === 204) return undefined as T

  let body: unknown = null
  try {
    body = await res.json()
  } catch {
    body = null
  }

  if (!res.ok) {
    const err = (body as { error?: ApiErrorShape } | null)?.error
    throw new ApiClientError(
      err?.code ?? 'unknown',
      err?.message ?? `HTTP ${res.status}`,
      res.status,
      err?.detail,
    )
  }
  return body as T
}

export const api = {
  get: <T,>(path: string) => request<T>(path),
  post: <T,>(path: string, data?: unknown) =>
    request<T>(path, { method: 'POST', body: data === undefined ? undefined : JSON.stringify(data) }),
  put: <T,>(path: string, data?: unknown) =>
    request<T>(path, { method: 'PUT', body: data === undefined ? undefined : JSON.stringify(data) }),
  patch: <T,>(path: string, data: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: <T,>(path: string) => request<T>(path, { method: 'DELETE' }),
}
