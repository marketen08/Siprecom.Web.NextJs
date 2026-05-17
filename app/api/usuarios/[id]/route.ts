import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/usuarios/[id]
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/auth/users/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/usuarios/[id] — baja del usuario (soft-delete vía Lockout en backend)
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/auth/users/${id}`, {
    method: "DELETE",
  })
  const data = await res.json().catch(() => ({}))
  return Response.json(data, { status: res.status })
}
