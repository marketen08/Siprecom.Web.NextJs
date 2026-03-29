import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/usuarios/[id]/proyectos/[proyectoId]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/usuarios/[id]/proyectos/[proyectoId]">
) {
  const { id, proyectoId } = await context.params
  const res = await backendFetch(request, `/auth/users/${id}/proyectos/${proyectoId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
