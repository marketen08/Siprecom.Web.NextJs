import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/registros/[id]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
