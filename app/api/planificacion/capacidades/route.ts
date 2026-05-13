import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const res = await backendFetch(request, "/planificacion/capacidades")
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

export async function PUT(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/planificacion/capacidades", {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
