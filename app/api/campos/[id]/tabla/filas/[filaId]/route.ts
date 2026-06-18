import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/campos/[id]/tabla/filas/[filaId]">
) {
  const { id, filaId } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/campos/${id}/tabla/filas/${filaId}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/campos/[id]/tabla/filas/[filaId]">
) {
  const { id, filaId } = await context.params
  const res = await backendFetch(request, `/campos/${id}/tabla/filas/${filaId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
