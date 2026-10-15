import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/testgroups/[id]/tareas/[tareaId]/reincorporar
// Revive una TG-tarea que había sido excluida (soft-delete → activa).
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/tareas/[tareaId]/reincorporar">,
) {
  const { id, tareaId } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/tareas/${tareaId}/reincorporar`, {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
