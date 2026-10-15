import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/pid-archivos/[id]/pendientes?soloAbiertos=true → payload de pines para el visor.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/pid-archivos/[id]/pendientes">
) {
  const { id } = await context.params
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/pid-archivos/${id}/pendientes${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
