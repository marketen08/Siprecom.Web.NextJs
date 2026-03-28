import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/clientes/[id]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/clientes/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/clientes/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/clientes/[id]
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/clientes/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/clientes/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/clientes/[id]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/clientes/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/clientes/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
