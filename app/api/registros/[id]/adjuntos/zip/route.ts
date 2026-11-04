import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/registros/[id]/adjuntos/zip — descarga los adjuntos del registro en un
// ZIP, con el formato original de cada archivo. Está siempre disponible: el PDF del
// registro sólo puede incorporar lo que se convierte en páginas (ver la funcionalidad
// REGISTRO_PDF_CON_ADJUNTOS), y un Excel o un Word sirven de poco impresos.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/adjuntos/zip">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/adjuntos/zip`)

  // Si el backend no devolvió un ZIP (ej: el registro no tiene adjuntos), pasamos el
  // cuerpo tal cual para que el mensaje se lea en vez de bajar un .zip corrupto.
  const contentType = res.headers.get("Content-Type") ?? ""
  if (!res.ok || !contentType.includes("zip")) {
    const text = await res.text()
    return new Response(text || JSON.stringify({ message: `Backend devolvió ${res.status}.` }), {
      status: res.status,
      headers: { "Content-Type": contentType.includes("json") ? "application/json" : "text/plain; charset=utf-8" },
    })
  }

  return new Response(res.body, {
    status: res.status,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition":
        res.headers.get("Content-Disposition") ?? `attachment; filename="adjuntos-${id}.zip"`,
    },
  })
}
