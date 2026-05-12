import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// Acciones de workflow del pendiente: iniciar / enviar-aprobacion / aprobar / rechazar / cancelar.
// También aplica al endpoint `comentarios` que recibe POST.
const ACCIONES_PERMITIDAS = new Set([
  "iniciar",
  "enviar-aprobacion",
  "aprobar",
  "rechazar",
  "cancelar",
  "comentarios",
])

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/[accion]">,
) {
  const { id, accion } = await context.params
  if (!ACCIONES_PERMITIDAS.has(accion)) {
    return Response.json({ message: `Acción '${accion}' no permitida.` }, { status: 400 })
  }
  const body = await request.json().catch(() => ({}))
  const res = await backendFetch(request, `/pendientes/${id}/${accion}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
