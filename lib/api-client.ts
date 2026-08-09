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

import { useAuthStore } from "@/store/auth-store"

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

// Latch global: sin esto, cuando llegan N respuestas 401 concurrentes (el user
// tiene múltiples queries en la página cuando se cierra la sesión en otro
// dispositivo), cada una reasigna `window.location` y el browser queda con la
// navegación "en curso" reiniciándose → pantalla en blanco recargando en loop.
let redirecting = false

function redirectToLogin(reason?: string): never {
  const target = reason ? `/login?reason=${reason}` : "/login"
  const err = new Error("Sesión expirada") as ApiError
  err.status = 401
  err.body = reason ? { code: "SESSION_SUPERSEDED" } : undefined

  if (redirecting) throw err
  redirecting = true

  // Logout local SIEMPRE: si el user persiste en el store (localStorage), los
  // componentes/queries siguen actuando como "logueado" y el RouteGuard rebota a
  // /dashboard → loop de 401 (había que borrar datos del navegador a mano). Al
  // limpiarlo, /login se queda y muestra el form. getState() funciona fuera de React.
  try { useAuthStore.getState().clearUser() } catch { /* noop */ }

  if (typeof window !== "undefined") {
    // Si ya estamos en /login no navegamos: reasignar la misma URL reinicia el
    // parseo del documento y se ve como "recarga infinita" cuando llegan varios
    // 401 en fila. .replace() para no acumular history entries.
    if (window.location.pathname !== "/login") {
      window.location.replace(target)
    } else if (reason && !window.location.search.includes(`reason=${reason}`)) {
      window.location.replace(target)
    }
  }
  throw err
}

interface ValidationErrorItem {
  field?: string
  errors?: string[]
}

/**
 * Error con info extra del backend (body, status). El consumidor puede castear
 * el Error a este shape para leer campos custom como `existingUserId` en un 409.
 */
export interface ApiError extends Error {
  body?: any
  status?: number
}

async function parseError(res: Response): Promise<ApiError> {
  const body = await res.json().catch(() => ({ message: res.statusText }))

  // Si el backend devolvió errores de validación con campo, los listamos para que
  // el usuario sepa exactamente qué falló (ej. "Nombre: Ya existe...").
  let message: string
  if (Array.isArray(body?.errors) && body.errors.length > 0) {
    const lineas = (body.errors as ValidationErrorItem[]).flatMap((e) =>
      Array.isArray(e.errors)
        ? e.errors.map((msg) => (e.field ? `${e.field}: ${msg}` : msg))
        : []
    )
    message = lineas.length > 0 ? lineas.join("\n") : (body?.message ?? "Error inesperado")
  } else {
    message = body?.message ?? "Error inesperado"
  }

  const err = new Error(message) as ApiError
  err.body = body
  err.status = res.status
  return err
}

async function request<T>(input: string, init?: RequestInit): Promise<T> {
  const res = await fetch(input, init)

  if (res.status === 401) {
    // Sesión reemplazada (login en otro dispositivo): no reintentar refresh,
    // ir directo a login con el motivo para mostrar el mensaje.
    const body = await res.clone().json().catch(() => null)
    if (body?.code === "SESSION_SUPERSEDED") redirectToLogin("session_superseded")

    const refreshed = await tryRefresh()
    if (!refreshed) redirectToLogin()

    // Reintentar la request original con las nuevas cookies
    const retry = await fetch(input, init)
    if (retry.status === 401) {
      const rbody = await retry.clone().json().catch(() => null)
      redirectToLogin(rbody?.code === "SESSION_SUPERSEDED" ? "session_superseded" : undefined)
    }
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
