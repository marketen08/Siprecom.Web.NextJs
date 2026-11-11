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
  // El body lleva el motivo, que el backend exige cuando se descarta un registro ya
  // cerrado con las firmas del papel. Sin reenviarlo, ese caso rebota siempre.
  const body = await request.text()
  const res = await backendFetch(request, `/testgroups/${id}/tareas/${tareaId}/reiniciar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
