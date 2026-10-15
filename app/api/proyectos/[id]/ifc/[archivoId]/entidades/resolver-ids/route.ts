import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/entidades/resolver-ids
// Body: { apsObjectIds: number[] } — cadena de dbIds del click en el visor.
// Gemelo de /resolver pero por dbId: le evita al visor construir el indice
// externalId -> dbId, que en maquetas grandes tarda minutos.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> },
) {
  const { id, archivoId } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/resolver-ids`,
    { method: "POST", body },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
