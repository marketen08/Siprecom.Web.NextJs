import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/usuarios/[id]/proyectos
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/proyectos">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/auth/users/${id}/proyectos`)
  const data = await parseJsonOrEmpty(res, "Error al obtener proyectos")
  return Response.json(data, { status: res.status })
}

// POST /api/usuarios/[id]/proyectos
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/proyectos">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/auth/users/${id}/proyectos`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  // El backend puede devolver body vacío (ej. 403 Forbid()). Sin esto el
  // proxy rompe con "Unexpected end of JSON input" → 500 al cliente.
  const data = await parseJsonOrEmpty(res, statusMessage(res.status))
  return Response.json(data, { status: res.status })
}

async function parseJsonOrEmpty(res: Response, fallbackMessage: string): Promise<unknown> {
  const text = await res.text()
  if (!text) return { message: fallbackMessage }
  try {
    return JSON.parse(text)
  } catch {
    return { message: text || fallbackMessage }
  }
}

function statusMessage(status: number): string {
  if (status === 403) return "No tenés permiso para esta acción."
  if (status === 404) return "Recurso no encontrado."
  if (status >= 500) return "Error interno del servidor."
  if (status >= 400) return "Error en la solicitud."
  return "OK"
}
