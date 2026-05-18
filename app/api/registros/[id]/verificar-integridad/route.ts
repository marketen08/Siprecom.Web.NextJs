import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/registros/[id]/verificar-integridad
// Proxy al backend que recalcula el hash de cada firma y lo compara con el
// persistido. Detecta tampering post-firma de los valores del registro.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/verificar-integridad">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/verificar-integridad`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
