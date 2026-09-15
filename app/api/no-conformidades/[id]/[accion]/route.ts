import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

/**
 * Acciones del workflow de una etapa sola. Las de eficacia van por su propia
 * ruta anidada (eficacia/objetivo, eficacia/resultado) porque el path tiene un
 * segmento más y no encaja acá.
 *
 * La whitelist no es decorativa: sin ella este proxy reenviaría cualquier
 * segmento al backend, incluidos paths que el controller no expone.
 */
const ACCIONES_PERMITIDAS = new Set([
  "evaluar",
  "accion-inmediata",
  "investigacion",
  "aprobar",
  "rechazar",
  "cancelar",
  "comentarios",
  "pendientes",
])

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/no-conformidades/[id]/[accion]">,
) {
  const { id, accion } = await context.params
  if (!ACCIONES_PERMITIDAS.has(accion)) {
    return Response.json({ message: `Acción '${accion}' no permitida.` }, { status: 400 })
  }
  const body = await request.json().catch(() => ({}))
  const res = await backendFetch(request, `/no-conformidades/${id}/${accion}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
