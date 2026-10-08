import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Los equipos de administración de un usuario — alimenta el tab "Equipos" de su ficha.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/equipos/usuario/[usuarioId]">,
) {
  const { usuarioId } = await context.params
  const res = await backendFetch(request, `/equipos/usuario/${usuarioId}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
