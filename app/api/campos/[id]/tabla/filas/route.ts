import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Si el backend devolvió HTML (página de error de dev) en vez de JSON,
// extrae lo más útil del body para que el cliente vea un mensaje real.
async function safeReadBody(res: Response) {
  const text = await res.text()
  try {
    return JSON.parse(text)
  } catch {
    const stripped = text
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
    const message = stripped.slice(0, 500) || res.statusText
    return { message }
  }
}

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/campos/[id]/tabla/filas">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/campos/${id}/tabla/filas`)
  const data = await safeReadBody(res)
  return Response.json(data, { status: res.status })
}

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/campos/[id]/tabla/filas">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/campos/${id}/tabla/filas`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await safeReadBody(res)
  return Response.json(data, { status: res.status })
}
