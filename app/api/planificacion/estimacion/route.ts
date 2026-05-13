import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const fechaInicio = request.nextUrl.searchParams.get("fechaInicio")
  const path = fechaInicio
    ? `/planificacion/estimacion?fechaInicio=${encodeURIComponent(fechaInicio)}`
    : "/planificacion/estimacion"
  const res = await backendFetch(request, path)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
