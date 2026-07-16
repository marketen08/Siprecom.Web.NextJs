import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/testgroups/[id]/tareas/excluidas
// Lista de tareas soft-deleted del pack para el panel de config en Alcance.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/tareas/excluidas">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/tareas/excluidas`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
