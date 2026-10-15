import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planillas/{id}/campos/{campoId}/apropiar
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/campos/[campoId]/apropiar">
) {
  const { id, campoId } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/campos/${campoId}/apropiar`, {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
