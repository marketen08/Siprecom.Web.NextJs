import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementostareas/{id}/reactivar → vuelve una ET CANCELADA a PENDIENTE.
// Guards backend: estado actual CANCELADO, Elemento activo, Tarea vigente.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/elementostareas/[id]/reactivar">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/${id}/reactivar`, {
    method: "POST",
    body: JSON.stringify({}),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
