import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/usuarios-grupos/{id}/miembros/{usuarioId}/responsable
// Marca o desmarca al miembro como responsable del grupo.
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/usuarios-grupos/[id]/miembros/[usuarioId]/responsable">,
) {
  const { id, usuarioId } = await context.params
  const body = await request.json()
  const res = await backendFetch(
    request,
    `/usuarios-grupos/${id}/miembros/${usuarioId}/responsable`,
    { method: "PATCH", body: JSON.stringify(body) },
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
