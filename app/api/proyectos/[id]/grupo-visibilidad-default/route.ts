import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// PATCH /api/proyectos/[id]/grupo-visibilidad-default — setea el grupo
// aplicado por defecto al activar el toggle "Pendiente interno" en el form
// de pendiente. Pasar null desconfigura (el toggle abre "Opciones avanzadas"
// pidiendo elegir grupo manualmente).
//
// NOTE: tipamos `context` con un objeto ad-hoc en vez de `RouteContext<"...">`
// porque el generador de tipos de Next.js recién sabe del nuevo path después
// del primer `next dev`/`next build`. Al restart del dev server podés migrar
// a la forma tipada (ver /api/proyectos/[id]/nivel-mc/route.ts).
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/proyectos/${id}/grupo-visibilidad-default`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: "Error" }))
  return Response.json(data, { status: res.status })
}
