import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/testgroups/[id]/tareas/[tareaId]/reiniciar
// Reinicia la TG-tarea: reset a PENDIENTE + hard-delete del Registro asociado.
// Espeja el endpoint /api/elementos-tareas/[id]/reiniciar del flujo de elemento.
export async function POST(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/tareas/[tareaId]/reiniciar">,
) {
  const { id, tareaId } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/tareas/${tareaId}/reiniciar`, {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
