import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// POST /api/planificacion/generar — body { fechaInicio?, dryRun }
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/planificacion/generar", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
