import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/testgroups?page=&pageSize=&tipo=&subSistemaId=&nombre=
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/testgroups${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/testgroups
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/testgroups", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
