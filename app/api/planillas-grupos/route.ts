import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

export async function GET(request: NextRequest) {
  const qs = request.nextUrl.search
  const res = await backendFetch(request, `/planillas-grupos${qs}`)
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}

export async function POST(request: NextRequest) {
  const body = await request.text()
  const res = await backendFetch(request, "/planillas-grupos", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
