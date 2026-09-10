import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/no-conformidades/{id} — detalle con historial, comentarios y vínculos.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/no-conformidades/[id]">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/no-conformidades/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/no-conformidades/{id} — edición de cabecera.
// No toca el contenido de las etapas ni el estado: eso va por las acciones del
// workflow, que son las que dejan rastro en el historial.
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/no-conformidades/[id]">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/no-conformidades/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
