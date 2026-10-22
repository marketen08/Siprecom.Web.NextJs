import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planillas/{id}/reemplazar-diseno — le pone a esa planilla el diseño del
// JSON, conservando su identidad (mismo id, código y nombre).
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json()
  const res = await backendFetch(request, `/planillas/${id}/reemplazar-diseno`, {
    method: "POST",
    body: JSON.stringify(body),
  })
  // Mismo manejo que el import: un 500 del backend puede venir en HTML, y
  // Response.json sobre eso tira un error que esconde el de verdad.
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
