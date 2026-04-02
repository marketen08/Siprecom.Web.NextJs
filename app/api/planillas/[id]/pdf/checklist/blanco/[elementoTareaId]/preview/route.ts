import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/[id]/pdf/checklist/blanco/[elementoTareaId]/preview
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/pdf/checklist/blanco/[elementoTareaId]/preview">
) {
  const { id, elementoTareaId } = await context.params
  const res = await backendFetch(
    request,
    `/planillas/${id}/pdf/checklist/blanco/${elementoTareaId}/preview`
  )
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? "inline",
    },
  })
}
