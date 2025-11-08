/**
 * Centralized fetch wrapper with error handling
 */

export class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any,
  ) {
    super(message)
    this.name = "FetchError"
  }
}

export async function fetcher<T = any>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })

  const data = await response.json().catch(() => ({}))

  if (!response.ok) {
    throw new FetchError(data.error || `Request failed with status ${response.status}`, response.status, data)
  }

  return data
}

/**
 * Helper for POST requests
 */
export async function post<T = any>(url: string, body: any): Promise<T> {
  return fetcher<T>(url, {
    method: "POST",
    body: JSON.stringify(body),
  })
}

/**
 * Helper for GET requests with query params
 */
export async function get<T = any>(url: string, params?: Record<string, string>): Promise<T> {
  const searchParams = params ? `?${new URLSearchParams(params)}` : ""
  return fetcher<T>(`${url}${searchParams}`)
}
