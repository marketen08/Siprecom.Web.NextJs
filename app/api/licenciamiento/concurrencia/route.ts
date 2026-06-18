import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/licenciamiento/concurrencia → reporte mensual de concurrencia
export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/licenciamiento/concurrencia")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
