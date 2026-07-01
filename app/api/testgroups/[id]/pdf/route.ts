import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/testgroups/[id]/pdf — proxy binario del PDF del pack.
// A diferencia de los demás proxies (que devuelven JSON), acá reenviamos
// el body de octet-stream sin tocar y con el Content-Disposition original.
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/testgroups/[id]/pdf">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/testgroups/${id}/pdf`)
  if (!res.ok) {
    // El backend devuelve JSON en errores — lo pasamos tal cual.
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
      "Content-Disposition": res.headers.get("content-disposition") ?? `attachment; filename="testgroup.pdf"`,
    },
  })
}
