import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/subsistema/[subSistemaId]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/avance/subsistema/[subSistemaId]">
) {
  const { subSistemaId } = await context.params
  const res = await backendFetch(request, `/avance/subsistema/${subSistemaId}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// GET /api/avance/subsistema/[subSistemaId]/elementos → ver route anidada
