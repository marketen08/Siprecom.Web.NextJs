import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/elementos-tareas/[id]/puede-ejecutar
// Chequea sin efectos si la ET puede arrancar (predecesores completos +
// niveles secuenciales del proyecto). Se usa antes de navegar a la carga
// de planilla física / abrir el formulario digital.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/elementos-tareas/[id]/puede-ejecutar">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/elementos-tareas/${id}/puede-ejecutar`, { method: "GET" })
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 }
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
