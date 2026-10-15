import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/pid-archivos/[id]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/pid-archivos/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/pid-archivos/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PUT /api/pid-archivos/[id]  — actualiza metadata + set de subsistemas vinculados.
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/pid-archivos/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/pid-archivos/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/pid-archivos/[id]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/pid-archivos/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/pid-archivos/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
