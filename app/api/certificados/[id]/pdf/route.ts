import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/certificados/[id]/pdf — proxy binario (mismo patrón que testgroups/pdf).
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/certificados/[id]/pdf">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/certificados/${id}/pdf`)
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
      "Content-Type": "application/pdf",
      "Content-Disposition": res.headers.get("content-disposition") ?? `attachment; filename="certificado.pdf"`,
    },
  })
}
