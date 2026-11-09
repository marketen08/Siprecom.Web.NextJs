import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/elementostareas/[id]/asignados → deja los asignados de UNA tarea en
// exactamente los indicados. Es reemplazo, a diferencia del bulk: sobre una fila el
// usuario ve quiénes están y a quién destilda.
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/elementostareas/[id]/asignados">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/elementos-tareas/${id}/asignados`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
