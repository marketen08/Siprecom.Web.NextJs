import { NextRequest, NextResponse } from "next/server"
import type { BackendAuthResponse } from "@/types/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

// GET /api/proyectos/[id]/ifc/[archivoId]/stream
//
// Proxy de descarga binaria. Stream-ea el blob desde el backend tal cual
// (sin tocar el body) para no cargar archivos de 100s de MB en memoria.
// Se usa como fallback cuando el cliente no puede hacer fetch directo al
// blob (CORS no configurado en el storage account).
//
// No usa el helper compartido `backendFetch` porque ese consume el body como
// text() en el caso de refresh, lo que corrompería bytes binarios.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/stream">,
) {
  const { id, archivoId } = await context.params
  const path = `/proyectos/${id}/ifc/${archivoId}/stream`

  const accessToken = request.cookies.get("accessToken")?.value
  const refreshToken = request.cookies.get("refreshToken")?.value

  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 })
  }

  let upstream = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  let newTokens: BackendAuthResponse | null = null

  if (upstream.status === 401 && refreshToken) {
    // Cerramos el body del 401 para liberar el socket antes del retry.
    await upstream.body?.cancel().catch(() => {})

    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken }),
    })

    if (!refreshRes.ok) {
      const response = NextResponse.json({ message: "Sesión expirada" }, { status: 401 })
      response.cookies.delete("accessToken")
      response.cookies.delete("refreshToken")
      return response
    }

    newTokens = await refreshRes.json()
    upstream = await fetch(`${BACKEND_URL}${path}`, {
      headers: { Authorization: `Bearer ${newTokens!.accessToken}` },
    })
  }

  if (!upstream.ok) {
    // Error del backend: pasamos el JSON tal cual (es chico).
    const errText = await upstream.text().catch(() => "")
    return new NextResponse(errText || JSON.stringify({ message: "Error al descargar el archivo." }), {
      status: upstream.status,
      headers: { "Content-Type": "application/json" },
    })
  }

  const headers: Record<string, string> = {
    "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
  }
  const contentLength = upstream.headers.get("content-length")
  if (contentLength) headers["Content-Length"] = contentLength
  // Permite que el viewer descargue por chunks si quisiera.
  const acceptRanges = upstream.headers.get("accept-ranges")
  if (acceptRanges) headers["Accept-Ranges"] = acceptRanges

  const response = new NextResponse(upstream.body, {
    status: 200,
    headers,
  })

  if (newTokens) {
    response.cookies.set("accessToken", newTokens.accessToken, {
      ...COOKIE_OPTS,
      maxAge: 60 * 60,
    })
    response.cookies.set("refreshToken", newTokens.refreshToken, {
      ...COOKIE_OPTS,
      maxAge: 60 * 60 * 24 * 15,
    })
  }

  return response
}
