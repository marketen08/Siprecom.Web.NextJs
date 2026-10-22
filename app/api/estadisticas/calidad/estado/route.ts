import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/estadisticas/calidad/estado — el tablero entero del proyecto activo.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/estadisticas/calidad/estado")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
