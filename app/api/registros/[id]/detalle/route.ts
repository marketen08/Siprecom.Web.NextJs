import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/registros/[id]/detalle
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/detalle">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/detalle`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
