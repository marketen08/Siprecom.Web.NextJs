import { NextRequest, NextResponse } from "next/server"
import { decodeJWT } from "@/lib/utils"
import type { BackendAuthResponse } from "@/types/auth"

const API_URL = process.env.API_URL

export async function POST(request: NextRequest) {
  const { idToken } = await request.json()

  if (!idToken) {
    return NextResponse.json({ message: "idToken requerido" }, { status: 400 })
  }

  const backendRes = await fetch(`${API_URL}/auth/microsoft`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ IdToken: idToken }),
  })

  if (!backendRes.ok) {
    const error = await backendRes.json().catch(() => ({}))
    return NextResponse.json(
      {
        message: error.error ?? error.message ?? "No se pudo iniciar sesión con Microsoft",
        // Propagamos el code del backend (ej. ACCESS_NOT_PROVISIONED) para que el
        // callback distinga "sin acceso" de un error genérico.
        code: error.code,
      },
      { status: backendRes.status }
    )
  }

  const data: BackendAuthResponse = await backendRes.json()
  const jwt = decodeJWT(data.accessToken)
  const email = jwt["email"] as string
  // El backend emite el claim como "roles" (array, ya expandido por jerarquía).
  // Antes se leía la URI de ClaimTypes.Role que NO existe en el token.
  const roles = jwt["roles"] as string | string[] | undefined

  const response = NextResponse.json({
    user: {
      email,
      roles: Array.isArray(roles) ? roles : roles ? [roles] : [],
    },
  })

  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
  }

  response.cookies.set("accessToken", data.accessToken, {
    ...cookieOpts,
    maxAge: 60 * 60,
  })
  response.cookies.set("refreshToken", data.refreshToken, {
    ...cookieOpts,
    maxAge: 60 * 60 * 24 * 15,
  })

  return response
}
