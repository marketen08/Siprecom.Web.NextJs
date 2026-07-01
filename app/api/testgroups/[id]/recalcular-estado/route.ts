import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/testgroups/[id]/recalcular-estado
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/recalcular-estado">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/recalcular-estado`, { method: "POST" })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
