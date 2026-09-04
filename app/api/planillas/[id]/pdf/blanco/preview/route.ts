import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/[id]/pdf/blanco/preview — mismo PDF que /pdf/blanco pero
// inline: el backend lo devuelve sin filename, así que el navegador lo abre en
// su visor en vez de bajarlo. Sirve para "ver antes de asignar" sin llenar la
// carpeta de descargas.
//
// El segmento literal `preview` gana sobre el hermano dinámico
// `[elementoTareaId]`, así que esta ruta no colisiona con
// /pdf/blanco/[elementoTareaId]/preview.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/planillas/[id]/pdf/blanco/preview">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/pdf/blanco/preview`)
  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("Content-Type") ?? "application/pdf",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ??
        `inline; filename="planilla-${id}.pdf"`,
    },
  })
}
