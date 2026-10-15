import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

/** Reclasificación del pendiente — mueve el ámbito. Ver PendienteService.ReclasificarAsync. */
export async function PUT(
  request: NextRequest,
  // Tipado explícito: los tipos de ruta de Next se generan al build y todavía no
  // conocen este endpoint nuevo.
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/pendientes/${id}/ambito`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
