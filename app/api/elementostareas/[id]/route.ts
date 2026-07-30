import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/elementostareas/{id} → update de una ElementoTarea (incluye asignar responsable).
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/elementostareas/[id]">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/elementos-tareas/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}

// DELETE /api/elementostareas/{id} → soft-delete (solo PENDIENTE/CANCELADO).
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/elementostareas/[id]">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/${id}`, {
    method: "DELETE",
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
