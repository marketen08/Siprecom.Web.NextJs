import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/modulos/[id]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/modulos/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/modulos/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/modulos/[id]
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/modulos/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/modulos/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/modulos/[id]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/modulos/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/modulos/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
