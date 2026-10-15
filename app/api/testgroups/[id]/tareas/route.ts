import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/testgroups/[id]/tareas
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/tareas">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/tareas`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
