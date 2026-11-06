import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/[id]/campos-exclusivos → los campos que SÓLO usa esta planilla, o
// sea los que quedarían huérfanos en el catálogo al eliminarla. Es lo que el diálogo de
// borrado muestra junto al checkbox de limpieza.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/campos-exclusivos">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/campos-exclusivos`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
