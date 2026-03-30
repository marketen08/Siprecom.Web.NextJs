import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/subsistema/[subSistemaId]/elementos
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/avance/subsistema/[subSistemaId]/elementos">
) {
  const { subSistemaId } = await context.params
  const res = await backendFetch(request, `/avance/subsistema/${subSistemaId}/elementos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
