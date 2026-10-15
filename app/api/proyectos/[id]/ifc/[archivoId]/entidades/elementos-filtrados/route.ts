import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/proyectos/[id]/ifc/[archivoId]/entidades/elementos-filtrados?page&pageSize&busqueda
// Body: ProyectoIfcFiltroInput — el mismo del endpoint /filtrar.
//
// Devuelve los ELEMENTOS (no las piezas 3D) que pasan el filtro del visor, para
// que el panel "Ver elementos" muestre el mismo subconjunto que está resaltado.
//
// Tipo de context sin RouteContext<> porque la ruta es nueva y los types
// generados por Next no la tienen todavía.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string; archivoId: string }> },
) {
  const { id, archivoId } = await context.params
  const body = await request.text()
  const qs = request.nextUrl.searchParams.toString()
  const res = await backendFetch(
    request,
    `/proyectos/${id}/ifc/${archivoId}/entidades/elementos-filtrados${qs ? `?${qs}` : ""}`,
    { method: "POST", body },
  )
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
