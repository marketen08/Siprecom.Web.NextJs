import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/pid-archivos/[id]/download → { data: { url, nombreArchivo, expiraEnMinutos } }
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/pid-archivos/[id]/download">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/pid-archivos/${id}/download`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
