import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/campos/sin-uso → preview de la limpieza del catálogo: qué campos no usa
// ninguna planilla activa, y cuáles se saltean con su motivo.
//
// El segmento literal gana sobre /api/campos/[id], así que "sin-uso" no se confunde
// con un id.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/campos/sin-uso")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
