import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/registros/[id]/pdf/preview — el mismo PDF que /pdf pero inline, para
// verlo embebido (iframe) en vez de descargarlo. Lo usa la vista "Ver como PDF"
// del registro digital: a la hora de firmar, el PDF es lo que realmente se firma.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/pdf/preview">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/pdf/preview`)

  // Mismo criterio que /pdf: si el backend no devolvió un PDF, mostramos el error
  // en texto en lugar de romper el visor con un stream inválido.
  const contentType = res.headers.get("Content-Type") ?? ""
  if (!res.ok || !contentType.includes("pdf")) {
    const text = await res.text()
    return new Response(text || JSON.stringify({ message: `Backend devolvió ${res.status}.` }), {
      status: res.status,
      headers: { "Content-Type": contentType.includes("json") ? "application/json" : "text/plain; charset=utf-8" },
    })
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="registro-${id}.pdf"`,
    },
  })
}
