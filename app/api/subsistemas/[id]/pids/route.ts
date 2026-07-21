import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/subsistemas/[id]/pids  → PIDs vinculados al subsistema.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/subsistemas/[id]/pids">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/subsistemas/${id}/pids`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
