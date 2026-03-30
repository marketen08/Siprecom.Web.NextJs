import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/sistema/[sistemaId]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/avance/sistema/[sistemaId]">
) {
  const { sistemaId } = await context.params
  const res = await backendFetch(request, `/avance/sistema/${sistemaId}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
