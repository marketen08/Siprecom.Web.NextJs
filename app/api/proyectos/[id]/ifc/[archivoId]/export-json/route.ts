import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/ifc/[archivoId]/export-json — descarga el JSON de la maqueta.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]/ifc/[archivoId]/export-json">,
) {
  const { id, archivoId } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/ifc/${archivoId}/export-json`)
  if (!res.ok) {
    const text = await res.text()
    return new Response(text, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
    })
  }
  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? `attachment; filename="maqueta.json"`,
    },
  })
}
