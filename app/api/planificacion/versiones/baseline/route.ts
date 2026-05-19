import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function POST(request: NextRequest) {
  const res = await backendFetch(request, "/planificacion/versiones/baseline", {
    method: "POST",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
