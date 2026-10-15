import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/testgroups/[id]/tareas/[tareaId]/registro/iniciar
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/tareas/[tareaId]/registro/iniciar">,
) {
  const { id, tareaId } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/tareas/${tareaId}/registro/iniciar`, {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
