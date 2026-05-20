import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/subsistemas/[id]/plano  (multipart/form-data, campo "archivo")
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/subsistemas/[id]/plano">
) {
  const { id } = await context.params
  const formData = await request.formData()
  const res = await backendFetch(request, `/subsistemas/${id}/plano`, {
    method: "POST",
    body: formData,
  })
  const data = await res.json().catch(() => ({ message: "Error al subir el plano" }))
  return Response.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/subsistemas/[id]/plano">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/subsistemas/${id}/plano`, { method: "DELETE" })
  const data = await res.json().catch(() => ({ message: "Error al borrar el plano" }))
  return Response.json(data, { status: res.status })
}
