import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// El backend hace 302 a una SAS URL del blob. Acá simplemente reenviamos el redirect.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/pdf-oficial">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/pdf-oficial`, { redirect: "manual" })

  if (res.status === 302 || res.status === 301) {
    const location = res.headers.get("Location")
    if (location) return Response.redirect(location, 302)
  }

  // Si el backend devolvió un error JSON, lo propagamos.
  const data = await res.json().catch(() => ({ message: "PDF no disponible" }))
  return Response.json(data, { status: res.status })
}
