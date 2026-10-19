import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/no-conformidades/areas — grupos elegibles como área afectada y como área
// de seguimiento en el proyecto activo. El backend los deriva de la matriz de
// autorización de Calidad del proyecto.
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/no-conformidades/areas")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
