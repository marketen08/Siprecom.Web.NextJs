import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/administracion/auditoria/excel?filtros...
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/administracion/auditoria/excel${search}`)
  if (!res.ok) {
    const body = await res.text()
    return new Response(body, {
      status: res.status,
      headers: { "Content-Type": res.headers.get("content-type") ?? "text/plain" },
    })
  }
  const buffer = await res.arrayBuffer()
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition":
        res.headers.get("content-disposition") ?? `attachment; filename="auditoria.xlsx"`,
    },
  })
}
