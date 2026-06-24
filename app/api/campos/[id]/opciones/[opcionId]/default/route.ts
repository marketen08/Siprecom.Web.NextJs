import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PUT /api/campos/[id]/opciones/[opcionId]/default — toggle del valor por defecto.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string; opcionId: string }> }
) {
  const { id, opcionId } = await context.params
  const res = await backendFetch(request, `/campos/${id}/opciones/${opcionId}/default`, {
    method: "PUT",
  })
  const data = await res.json().catch(() => ({ message: "Error al marcar el valor por defecto" }))
  return Response.json(data, { status: res.status })
}
