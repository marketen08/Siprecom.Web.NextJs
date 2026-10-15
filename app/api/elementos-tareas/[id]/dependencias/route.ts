import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/elementos-tareas/{id}/dependencias
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/[id]/dependencias">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/${id}/dependencias`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
