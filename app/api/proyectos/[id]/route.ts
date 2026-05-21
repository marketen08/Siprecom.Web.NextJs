import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]
export async function GET(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]">
) {
  const { id } = await context.params
  console.log("[proyectos/GET] id:", id, "BACKEND_URL set:", !!process.env.NEXT_PUBLIC_API_URL, "len:", process.env.NEXT_PUBLIC_API_URL?.length)
  try {
    const res = await backendFetch(request, `/proyectos/${id}`)
    console.log("[proyectos/GET] backend status:", res.status)
    const data = await res.json()
    return Response.json(data, { status: res.status })
  } catch (err) {
    console.error("[proyectos/GET] error:", err)
    throw err
  }
}

// PUT /api/proyectos/[id]
export async function PUT(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// PATCH /api/proyectos/[id]/flags
export async function PATCH(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]">
) {
  const { id } = await context.params
  const body = await request.json()
  const res = await backendFetch(request, `/proyectos/${id}/flags`, {
    method: "PATCH",
    body: JSON.stringify({ id, ...body }),
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}

// DELETE /api/proyectos/[id]
export async function DELETE(
  request: NextRequest,
  context: RouteContext<"/api/proyectos/[id]">
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}`, {
    method: "DELETE",
  })
  const data = await res.json()
  return Response.json(data, { status: res.status })
}
