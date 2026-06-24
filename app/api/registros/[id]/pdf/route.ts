import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/registros/[id]/pdf">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/registros/${id}/pdf`)

  // Si el backend NO devolvió un PDF (error 4xx/5xx con cuerpo JSON o texto),
  // lo surfaceamos inline como JSON para que el error sea legible en el browser
  // en lugar de romper el stream (ERR_INVALID_RESPONSE) o descargar un .pdf inválido.
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
      "Content-Disposition": res.headers.get("Content-Disposition") ?? `attachment; filename="registro-${id}.pdf"`,
    },
  })
}
