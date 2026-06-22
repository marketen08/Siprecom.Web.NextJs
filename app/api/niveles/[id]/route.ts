import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/niveles/[id]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/niveles/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/niveles/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/niveles/[id]
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/niveles/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/niveles/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/niveles/[id]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/niveles/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/niveles/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
