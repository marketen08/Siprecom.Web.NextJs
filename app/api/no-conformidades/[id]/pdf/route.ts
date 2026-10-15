import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/no-conformidades/{id}/pdf → proxy directo del blob del PDF.
// El backend manda el Content-Disposition con el filename (NC-0001.pdf).
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/no-conformidades/[id]/pdf">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/no-conformidades/${id}/pdf`)
  if (!res.ok) {
    // Si el backend devolvió JSON de error (404, módulo deshabilitado), lo
    // reenviamos tal cual en vez de servir un PDF roto.
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { "content-type": res.headers.get("content-type") ?? "application/json" },
    })
  }
  const buf = await res.arrayBuffer()
  return new Response(buf, {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition":
        res.headers.get("content-disposition") ?? `inline; filename="informe.pdf"`,
    },
  })
}
