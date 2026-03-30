import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/elementos-tareas/[id]/iniciar
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/[id]/iniciar">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/${id}/iniciar`, { method: "POST" })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
