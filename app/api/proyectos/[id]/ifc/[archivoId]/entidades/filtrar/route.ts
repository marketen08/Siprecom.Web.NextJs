import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/entidades/filtrar
// Body: { sistemaIds: [], subSistemaIds: [], especialidadIds: [], estadosVisuales: [], ocultarNoVinculadas }
//
// Tipo de context sin RouteContext<> porque la ruta es nueva y los types
// generados por Next no la tienen todavía. Cuando el dev server la registre,
// los types vuelven a estar disponibles.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> },
) {
  const { id, archivoId } = await context.params
  const body = await request.text()
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/filtrar`,
    { method: "POST", body },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
