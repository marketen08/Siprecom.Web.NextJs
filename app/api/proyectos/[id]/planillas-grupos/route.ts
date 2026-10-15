import { NextRequest } from "next/server"
import { backendFetch } from "@/lib/server/backend-fetch"

// GET /api/proyectos/[id]/planillas-grupos — grupos habilitados del proyecto.
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const res = await backendFetch(request, `/proyectos/${id}/planillas-grupos`)
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}

// PUT /api/proyectos/[id]/planillas-grupos — reemplaza el set de grupos.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params
  const body = await request.text()
  const res = await backendFetch(request, `/proyectos/${id}/planillas-grupos`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body,
  })
  const data = await res.json().catch(() => ({ message: res.statusText }))
  return Response.json(data, { status: res.status })
}
