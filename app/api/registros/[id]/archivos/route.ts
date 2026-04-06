import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/registros/[id]/archivos
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/archivos">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/archivos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
