import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/planificacion/tareas${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
