import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/[id]/export → descarga JSON
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/export">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/export`)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/json",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="planilla.json"`,
    },
  })
}
