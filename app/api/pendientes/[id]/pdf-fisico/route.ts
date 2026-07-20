import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

/**
 * Proxy del PDF físico del pendiente. El backend devuelve un 302 hacia la SAS URL
 * del blob — reenviamos ese redirect al browser. Con `redirect: "manual"` fetch
 * no sigue el 302, así que podemos leer el Location y hacer el redirect nosotros.
 */
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/pdf-fisico">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/pendientes/${id}/pdf-fisico`, {
    redirect: "manual",
  })

  if (res.status === 302 || res.status === 301) {
    const location = res.headers.get("location")
    if (location) return Response.redirect(location, 302)
  }

  // Error path: reenviamos el body al cliente (JSON con message).
  const body = await res.text()
  return new Response(body, {
    status: res.status,
    headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
  })
}
