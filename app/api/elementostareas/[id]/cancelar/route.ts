import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementostareas/{id}/cancelar → marca CANCELADO con motivo obligatorio.
// Requiere estado PENDIENTE o EN_PROCESO (guard del backend).
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/elementostareas/[id]/cancelar">,
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/elementos-tareas/${id}/cancelar`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
