import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/proyecto/[proyectoId]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/avance/proyecto/[proyectoId]">
) {
  const { proyectoId } = await context.params
  const res = await backendFetch(request, `/avance/proyecto/${proyectoId}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
