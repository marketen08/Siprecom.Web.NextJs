import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/pendientes/{id}/pdf → proxy directo del blob del PDF.
// El backend nos manda el Content-Disposition con el filename (P-042.pdf).
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/pendientes/[id]/pdf">,
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/pendientes/${id}/pdf`)
  if (!res.ok) {
    // Si el backend devolvió JSON de error, lo reenviamos como JSON.
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
      "content-disposition": res.headers.get("content-disposition") ?? `inline; filename="pendiente.pdf"`,
    },
  })
}
