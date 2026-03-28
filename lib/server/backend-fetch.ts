import { NextRequest } from "next/server"

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL

/**
 * Proxy helper (server-side only).
 * Lee el accessToken de la httpOnly cookie y llama al backend .NET con el header Authorization.
 */
export async function backendFetch(
  request: NextRequest,
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = request.cookies.get("accessToken")?.value

  if (!token) {
    return Response.json({ message: "No autenticado" }, { status: 401 })
  }

  const url = `${BACKEND_URL}${path}`

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers ?? {}),
    },
  })
}
