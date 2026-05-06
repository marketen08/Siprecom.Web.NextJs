import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// DELETE /api/proyectos/[id]/usuarios/[usuarioId]
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string; usuarioId: string }> }
) {
  const { id, usuarioId } = await context.params
  const res = await backendFetch(request, `/auth/proyectos/${id}/users/${usuarioId}`, {
    method: "DELETE",
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
