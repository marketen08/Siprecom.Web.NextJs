import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/usuarios/[id]/reactivar — limpia LockoutEnd en el backend
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/reactivar">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/auth/users/${id}/reactivar`, {
    method: "PUT",
  })
  const data = await res.json().catch(() => ({}))
  return Response.json(data, { status: res.status })
}
