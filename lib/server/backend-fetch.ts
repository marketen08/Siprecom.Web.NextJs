import { cookies } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import type { BackendAuthResponse } from "@/types/auth"
import { headersIpCliente } from "./ip-cliente"

const BACKEND_URL = process.env.API_URL

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

/**
 * Las cookies se escriben en el jar de `next/headers`, NO en el NextResponse
 * que devuelve este helper.
 *
 * El motivo: 304 de las 354 rutas que usan backendFetch hacen
 *
 *     const res = await backendFetch(request, "/loquesea")
 *     const data = await res.json()
 *     return Response.json(data, { status: res.status })
 *
 * o sea que re-arman la respuesta y **tiran las cabeceras**, cookies incluidas.
 * Poniéndolas en el NextResponse se perdían salvo en las pocas rutas que lo
 * devuelven tal cual. El jar de next/headers, en cambio, Next lo aplica a la
 * respuesta final salga por donde salga.
 *
 * Sin esto el token renovado nunca llegaba al browser y CADA request posterior
 * al vencimiento volvía a refrescar — invisible salvo por la cantidad de
 * llamadas a /auth/refresh, que es justo lo que hace saltar el rate limit.
 */
async function escribirCookies(tokens: BackendAuthResponse): Promise<void> {
  const jar = await cookies()
  jar.set("accessToken", tokens.accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 })
  jar.set("refreshToken", tokens.refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 15 })
}

/**
 * Borra las cookies de auth. El path explícito importa: sin él, el Set-Cookie de
 * borrado toma el default-path del request (/api/...) y NO elimina la cookie
 * real, que quedaría viva.
 */
async function clearAuthCookies(): Promise<void> {
  const jar = await cookies()
  jar.set("accessToken", "", { ...COOKIE_OPTS, maxAge: 0 })
  jar.set("refreshToken", "", { ...COOKIE_OPTS, maxAge: 0 })
}

// 401 por sesión reemplazada (login en otro dispositivo): borra cookies y
// propaga el code para que el cliente muestre el mensaje correcto.
async function sesionReemplazada(): Promise<NextResponse> {
  await clearAuthCookies()
  return NextResponse.json(
    { message: "Tu sesión se cerró porque iniciaste sesión en otro dispositivo.", code: "SESSION_SUPERSEDED" },
    { status: 401 },
  )
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

  // Sin ninguna de las dos no hay sesión que recuperar.
  if (!accessToken && !refreshToken) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 })
  }

  // Con access token, se intenta primero; el 401 se resuelve más abajo.
  //
  // Sin access token NO se llama al backend: esa llamada tiene 401 asegurado y
  // encima gasta un viaje. Se salta directo al refresh.
  //
  // Antes esta rama cortaba con 401 "No autenticado" sin mirar el refreshToken.
  // Como la cookie del access token dura exactamente lo mismo que el token —una
  // hora— el browser la borra justo cuando vence, así que el caso "cookie
  // presente, token vencido" que este bloque de refresh fue escrito para
  // resolver casi no ocurría: lo que pasaba siempre era el corte de arriba. El
  // refresh server-side era, en los hechos, código muerto.
  //
  // Lo tapaba que apiClient atrapa el 401 y renueva por su cuenta. Pero todo lo
  // que llama a /api con fetch crudo —la subida de maquetas, entre otros— no
  // tiene ese rescate: al cruzar la hora perdía la sesión y la subida se perdía
  // con ella, después de esperar la transferencia entera.
  const res = accessToken ? await callBackend(path, accessToken, options) : null

  // Caso feliz: no es 401
  if (res && res.status !== 401) return res

  // Sesión reemplazada (el user inició sesión en otro dispositivo): NO tiene
  // sentido refrescar (el refresh también va a fallar). Cortamos con el code
  // para que el frontend muestre el mensaje y mande a login.
  if (res) {
    const origBody = await res.clone().json().catch(() => null)
    if (origBody?.code === "SESSION_SUPERSEDED") {
      return await sesionReemplazada()
    }
  }

  // Token expirado o ausente — intentar renovar
  if (!refreshToken) {
    return NextResponse.json({ message: "Sesión expirada" }, { status: 401 })
  }

  const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headersIpCliente(request) },
    body: JSON.stringify({ accessToken, refreshToken }),
  })

  if (!refreshRes.ok) {
    // El refresh puede fallar por sesión reemplazada o por expiración real.
    const refBody = await refreshRes.clone().json().catch(() => null)
    if (refBody?.code === "SESSION_SUPERSEDED") return await sesionReemplazada()
    await clearAuthCookies()
    return NextResponse.json({ message: "Sesión expirada" }, { status: 401 })
  }

  const tokens: BackendAuthResponse = await refreshRes.json()

  await escribirCookies(tokens)

  // Se devuelve la respuesta del backend tal cual. Antes se la re-armaba con
  // NextResponse para poder colgarle las cookies; ahora van por el jar, así que
  // no hace falta — y se deja de romper todo lo que no sea JSON (descargas de
  // PDF y Excel, que pasaban por acá y salían con Content-Type de JSON).
  return await callBackend(path, tokens.accessToken, options)
}
