import { NextRequest, NextResponse } from "next/server"
import type { BackendAuthResponse } from "@/types/auth"

const BACKEND_URL = process.env.API_URL

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

// Borra las cookies de auth matcheando el path con el que se setearon ("/"). Sin
// el path explícito, el Set-Cookie de borrado toma el default-path del request
// (/api/...) y NO elimina la cookie real → queda viva.
function clearAuthCookies(response: NextResponse): void {
  response.cookies.set("accessToken", "", { ...COOKIE_OPTS, maxAge: 0 })
  response.cookies.set("refreshToken", "", { ...COOKIE_OPTS, maxAge: 0 })
}

// 401 por sesión reemplazada (login en otro dispositivo): borra cookies y
// propaga el code para que el cliente muestre el mensaje correcto.
function sesionReemplazada(): NextResponse {
  const r = NextResponse.json(
    { message: "Tu sesión se cerró porque iniciaste sesión en otro dispositivo.", code: "SESSION_SUPERSEDED" },
    { status: 401 },
  )
  clearAuthCookies(r)
  return r
}

/**
 * Llama al backend .NET con el Bearer token indicado.
 */
async function callBackend(
  path: string,
  token: string,
  options: RequestInit
): Promise<Response> {
  // Si el body es FormData, dejá que fetch ponga el Content-Type con boundary correcto.
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    ...((options.headers as Record<string, string>) ?? {}),
  }
  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json"
  }
  return fetch(`${BACKEND_URL}${path}`, { ...options, headers })
}

/**
 * Proxy helper (server-side only).
 * Lee el accessToken de la httpOnly cookie y llama al backend .NET.
 *
 * Si el backend devuelve 401 (token expirado):
 *  1. Intenta renovar usando el refreshToken
 *  2. Si renueva, setea las nuevas cookies y reintenta la request original
 *  3. Si el refresh falla, devuelve 401 y borra las cookies
 */
export async function backendFetch(
  request: NextRequest,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const accessToken = request.cookies.get("accessToken")?.value
  const refreshToken = request.cookies.get("refreshToken")?.value

  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 })
  }

  const res = await callBackend(path, accessToken, options)

  // Caso feliz: no es 401
  if (res.status !== 401) return res

  // Sesión reemplazada (el user inició sesión en otro dispositivo): NO tiene
  // sentido refrescar (el refresh también va a fallar). Cortamos con el code
  // para que el frontend muestre el mensaje y mande a login.
  const origBody = await res.clone().json().catch(() => null)
  if (origBody?.code === "SESSION_SUPERSEDED") {
    return sesionReemplazada()
  }

  // Token expirado — intentar renovar
  if (!refreshToken) {
    return NextResponse.json({ message: "Sesión expirada" }, { status: 401 })
  }

  const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ accessToken, refreshToken }),
  })

  if (!refreshRes.ok) {
    // El refresh puede fallar por sesión reemplazada o por expiración real.
    const refBody = await refreshRes.clone().json().catch(() => null)
    if (refBody?.code === "SESSION_SUPERSEDED") return sesionReemplazada()
    const response = NextResponse.json({ message: "Sesión expirada" }, { status: 401 })
    clearAuthCookies(response)
    return response
  }

  const tokens: BackendAuthResponse = await refreshRes.json()

  // Reintentar la request original con el nuevo access token
  const retryRes = await callBackend(path, tokens.accessToken, options)

  // Construir NextResponse para poder setear las nuevas cookies
  const body = await retryRes.text()
  const nextRes = new NextResponse(body, {
    status: retryRes.status,
    headers: { "Content-Type": "application/json" },
  })

  nextRes.cookies.set("accessToken", tokens.accessToken, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60,
  })
  nextRes.cookies.set("refreshToken", tokens.refreshToken, {
    ...COOKIE_OPTS,
    maxAge: 60 * 60 * 24 * 15,
  })

  return nextRes
}
