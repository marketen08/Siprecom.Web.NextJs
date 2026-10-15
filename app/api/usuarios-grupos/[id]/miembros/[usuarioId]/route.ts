import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/usuarios-grupos/[id]/miembros/[usuarioId]">,
) {
  const { id, usuarioId } = await context.params
  const res = await backendFetch(request, `/usuarios-grupos/${id}/miembros/${usuarioId}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
