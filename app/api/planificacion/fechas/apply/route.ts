import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planificacion/fechas/apply (multipart Archivo) → aplica el import + snapshot Pn.
export async function POST(request: NextRequest) {
  const formData = await request.formData()
  const res = await backendFetch(request, "/planificacion/fechas/apply", {
    method: "POST",
    body: formData,
  })
  const text = await res.text()
  const ct = res.headers.get("content-type") ?? ""
  if (!ct.includes("application/json")) {
    return Response.json(
      { message: `Backend devolvió ${res.status} no-JSON: ${text.slice(0, 500)}` },
      { status: res.status || 500 },
    )
  }
  return Response.json(JSON.parse(text), { status: res.status })
}
