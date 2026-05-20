import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/subsistemas/[id]/plano/download  → { data: { url, nombreArchivo, expiraEnMinutos } }
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/subsistemas/[id]/plano/download">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/subsistemas/${id}/plano/download`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
