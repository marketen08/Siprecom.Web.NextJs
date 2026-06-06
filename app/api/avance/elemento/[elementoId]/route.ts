import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/avance/elemento/[elementoId] — proxy a /avance/elemento/{elementoId}
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/avance/elemento/[elementoId]">,
) {
  const { elementoId } = await context.params
  const res = await backendFetch(request, `/avance/elemento/${elementoId}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
