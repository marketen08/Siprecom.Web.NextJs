import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/usuarios-grupos/[id]/miembros/[usuarioId]/impacto-quitar">,
) {
  const { id, usuarioId } = await context.params
  const res = await backendFetch(
    request,
    `/usuarios-grupos/${id}/miembros/${usuarioId}/impacto-quitar`,
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
