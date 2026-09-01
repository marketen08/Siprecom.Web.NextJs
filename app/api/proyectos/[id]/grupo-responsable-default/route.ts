import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/proyectos/[id]/grupo-responsable-default — setea el grupo
// aplicado por defecto al activar el toggle "Asignar al grupo responsable
// por defecto" en el form de pendiente. Pasar null desconfigura.
//
// NOTE: tipamos `context` ad-hoc porque el generador de tipos de Next.js
// recién sabe del nuevo path después del primer `next dev`/`next build`.
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/proyectos/${id}/grupo-responsable-default`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
