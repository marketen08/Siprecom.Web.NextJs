/**
 * Cliente HTTP del browser.
 * Llama a las API routes de Next.js (/api/...) que actúan como proxy al backend .NET.
 * Las cookies httpOnly se envían automáticamente al ser same-origin.
 *
 * Manejo de 401:
 *  1. Intenta renovar el access token via POST /api/auth/refresh
 *  2. Si renueva, reintenta la request original
 *  3. Si el refresh falla, redirige a /login
 */

// Singleton promise para evitar múltiples llamadas simultáneas al refresh
let refreshPromise: Promise<boolean> | null = null

async function tryRefresh(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch("/api/auth/refresh", { method: "POST" })
      .then((res) => res.ok)
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function redirectToLogin(): never {
  window.location.href = "/login"
  throw new Error("Sesión expirada")
}

interface ValidationErrorItem {
  field?: string
  errors?: string[]
}

async function parseError(res: Response): Promise<Error> {
  const body = await res.json().catch(() => ({ message: res.statusText }))

  // Si el backend devolvió errores de validación con campo, los listamos para que
  // el usuario sepa exactamente qué falló (ej. "Nombre: Ya existe...").
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    const lineas = (body.errors as ValidationErrorItem[]).flatMap((e) =>
      Array.isArray(e.errors)
        ? e.errors.map((msg) => (e.field ? `${e.field}: ${msg}` : msg))
        : []
    )
    if (lineas.length > 0) return new Error(lineas.join("\n"))
  }

  return new Error(body?.message ?? "Error inesperado")
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (!refreshed) redirectToLogin()

    // Reintentar la request original con las nuevas cookies
    const retry = await fetch(input, init)
    if (retry.status === 401) redirectToLogin()
    if (!retry.ok) throw await parseError(retry)
    return retry.json()
  }

  if (!res.ok) throw await parseError(res)
  return res.json()
}

export const apiClient = {
  get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(path, window.location.origin)
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, String(v)))
    }
    return request<T>(url.toString())
  },

  post<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  },

  put<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  },

  patch<T>(path: string, body: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
  },

  delete<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" })
  },
}
