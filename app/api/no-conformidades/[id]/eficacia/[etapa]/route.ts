import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

/**
 * Las dos etapas de eficacia:
 *   objetivo  — INDICADOR_EFICACIA → ESPERA_RESULTADO (qué se mide y cuándo)
 *   resultado — ESPERA_RESULTADO → FINALIZADO (si no fue eficaz, encadena un
 *               informe nuevo y el backend lo informa en el `message`)
 */
const ETAPAS_PERMITIDAS = new Set(["objetivo", "resultado"])

export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/no-conformidades/[id]/eficacia/[etapa]">,
) {
  const { id, etapa } = await context.params
  if (!ETAPAS_PERMITIDAS.has(etapa)) {
    return Response.json({ message: `Etapa '${etapa}' no permitida.` }, { status: 400 })
  }
  const body = await request.json().catch(() => ({}))
  const res = await backendFetch(request, `/no-conformidades/${id}/eficacia/${etapa}`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
