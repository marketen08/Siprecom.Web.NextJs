import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/planillas/disponibles?proyectoId=... — planillas disponibles para
// el proyecto (aplica filtro estricto por grupos habilitados).
export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search
  const res = await backendFetch(request, `/planillas/disponibles${qs}`)
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
