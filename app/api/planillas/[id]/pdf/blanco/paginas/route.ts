import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/[id]/pdf/blanco/paginas — vista previa del diseñador: el PDF en
// blanco como un PNG (base64) por página. El segmento literal gana sobre el hermano
// dinámico `[elementoTareaId]`, igual que `preview`.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/planillas/${id}/pdf/blanco/paginas`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
