import { NextRequest, NextResponse } from "next/server"
import type { BackendAuthResponse } from "@/types/auth"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
}

// POST /api/proyectos/crear-desde-ifc  (multipart/form-data)
//
// Proxy hacia el backend .NET. Implementación manual del refresh-token (no usa
// backendFetch) porque el body es multipart streaming — backendFetch convierte
// el body a text() en el flujo de retry, lo que rompería el archivo binario.
export async function POST(request: NextRequest) {
  const accessToken = request.cookies.get("accessToken")?.value
  const refreshToken = request.cookies.get("refreshToken")?.value

  if (!accessToken) {
    return NextResponse.json({ message: "No autenticado" }, { status: 401 })
  }

  const body = await request.arrayBuffer()
  const contentType = request.headers.get("content-type") ?? "application/octet-stream"

  let res = await fetch(`${BACKEND_URL}/proyectos/crear-desde-ifc`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": contentType,
    },
    body,
  })

  let newTokens: BackendAuthResponse | null = null
  if (res.status === 401 && refreshToken) {
    const refreshRes = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken, refreshToken }),
    })
    if (refreshRes.ok) {
      newTokens = await refreshRes.json()
      res = await fetch(`${BACKEND_URL}/proyectos/crear-desde-ifc`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${newTokens!.accessToken}`,
          "Content-Type": contentType,
        },
        body,
      })
    } else {
      const response = NextResponse.json({ message: "Sesión expirada" }, { status: 401 })
      response.cookies.delete("accessToken")
      response.cookies.delete("refreshToken")
      return response
    }
  }

  const responseBody = await res.text()
  const nextRes = new NextResponse(responseBody, {
    status: res.status,
    headers: { "Content-Type": "application/json" },
  })
  if (newTokens) {
    nextRes.cookies.set("accessToken", newTokens.accessToken, { ...COOKIE_OPTS, maxAge: 60 * 60 })
    nextRes.cookies.set("refreshToken", newTokens.refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 15 })
  }
  return nextRes
}
