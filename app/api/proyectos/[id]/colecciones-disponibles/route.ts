import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/{id}/colecciones-disponibles
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/colecciones-disponibles">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/colecciones-disponibles`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
