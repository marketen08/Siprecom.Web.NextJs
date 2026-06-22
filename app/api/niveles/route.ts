import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/niveles?page=1&pageSize=10&nombre=...
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/niveles${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/niveles
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/niveles", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
