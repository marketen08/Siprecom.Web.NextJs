import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/testgroups/[id]/tareas/[tareaId]/estado
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/tareas/[tareaId]/estado">
) {
  const { id, tareaId } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/testgroups/${id}/tareas/${tareaId}/estado`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
