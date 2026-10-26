import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementos-tareas/[id]/rehacer
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/[id]/rehacer">
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/elementos-tareas/${id}/rehacer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
