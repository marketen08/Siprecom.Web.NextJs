import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/elementos-tareas/dependencias/{id}  Body: { lagDias }
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/dependencias/[id]">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/elementos-tareas/dependencias/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/elementos-tareas/dependencias/{id}
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/dependencias/[id]">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/dependencias/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
