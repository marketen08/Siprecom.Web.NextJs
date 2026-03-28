import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos?page=1&pageSize=10&nombre=...
export async function GET(request: NextRequest) {
  const search = request.nextUrl.search
  const res = await backendFetch(request, `/proyectos${search}`)
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// POST /api/proyectos
export async function POST(request: NextRequest) {
  const body = await request.json()
  const res = await backendFetch(request, "/proyectos", {
    method: "POST",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
