/**
 * Cliente HTTP del browser.
 * Llama a las API routes de Next.js (/api/...) que actúan como proxy al backend .NET.
 * Las cookies httpOnly se envían automáticamente al ser same-origin.
 */

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: res.statusText }))
    throw new Error(error.message ?? "Error inesperado")
  }
  return res.json()
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(path, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    }
    return fetch(url.toString()).then(handleResponse<T>)
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse<T>)
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return fetch(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then(handleResponse<T>)
  },

  delete<T>(path: string): Promise<T> {
    return fetch(path, { method: "DELETE" }).then(handleResponse<T>)
  },
}
