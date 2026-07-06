import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/testgroups/[id]/elementos/desasignar-bulk — bulk soft-delete de asignaciones.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/elementos/desasignar-bulk">
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/testgroups/${id}/elementos/desasignar-bulk`,
    { method: "POST", body, headers: { "Content-Type": "application/json" } },
  )
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
