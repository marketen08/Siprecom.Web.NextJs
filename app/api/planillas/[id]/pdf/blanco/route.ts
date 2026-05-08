import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/[id]/pdf/blanco — descarga PDF de la planilla en blanco (sin contexto)
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/pdf/blanco">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/pdf/blanco`)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `attachment; filename="planilla-${id}.pdf"`,
    },
  })
}
