import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/[id]/pdf/blanco/testgroup/[testGroupTareaId]
// Descarga el PDF de la planilla en blanco con encabezado pre-llenado por el
// contexto de una TestGroupTarea (código pack + tarea, parámetros del pack,
// elementos agrupados en la primera página).
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/pdf/blanco/testgroup/[testGroupTareaId]">
) {
  const { id, testGroupTareaId } = await context.params
  const res = await backendFetch(
    request,
    `/planillas/${id}/pdf/blanco/testgroup/${testGroupTareaId}`
  )
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
