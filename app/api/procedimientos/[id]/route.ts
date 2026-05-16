import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/procedimientos/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/procedimientos/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/procedimientos/[id]  (multipart/form-data)
// Reenvía el FormData al backend; Archivo es opcional (si no viene, el backend conserva el PDF actual).
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/procedimientos/[id]">
) {
  const { id } = await context.params
  const formData = await request.formData()
  const res = await backendFetch(request, `/procedimientos/${id}`, {
    method: "PUT",
    body: formData,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/procedimientos/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/procedimientos/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
