import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/elementos-tareas/[id]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
